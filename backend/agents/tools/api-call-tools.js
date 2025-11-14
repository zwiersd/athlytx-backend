const fetch = require('node-fetch');
const { OAuthToken } = require('../../models');
const { decrypt } = require('../../utils/encryption');

/**
 * API Call Tools with Intelligent Retry Logic and Rate Limiting
 */

// Rate limiting storage (in-memory, could be moved to Redis for production)
const rateLimits = new Map();

/**
 * Check and update rate limit for a provider
 */
function checkRateLimit(provider, endpoint) {
    const key = `${provider}:${endpoint}`;
    const now = Date.now();
    const limit = rateLimits.get(key);

    // Provider-specific rate limits (requests per minute)
    const limits = {
        strava: { requests: 100, window: 15 * 60 * 1000 }, // 100 per 15 min
        oura: { requests: 5000, window: 24 * 60 * 60 * 1000 }, // 5000 per day
        garmin: { requests: 500, window: 60 * 1000 }, // Conservative estimate
        whoop: { requests: 100, window: 60 * 1000 } // Conservative estimate
    };

    const providerLimit = limits[provider.toLowerCase()] || { requests: 60, window: 60 * 1000 };

    if (!limit) {
        rateLimits.set(key, {
            requests: [now],
            resetAt: now + providerLimit.window
        });
        return { allowed: true, remaining: providerLimit.requests - 1 };
    }

    // Remove old requests outside the window
    limit.requests = limit.requests.filter(time => now - time < providerLimit.window);

    if (limit.requests.length >= providerLimit.requests) {
        const oldestRequest = Math.min(...limit.requests);
        const retryAfter = providerLimit.window - (now - oldestRequest);

        return {
            allowed: false,
            retryAfter: Math.ceil(retryAfter / 1000), // seconds
            message: `Rate limit exceeded for ${provider}. Retry after ${Math.ceil(retryAfter / 1000)}s`
        };
    }

    limit.requests.push(now);
    return {
        allowed: true,
        remaining: providerLimit.requests - limit.requests.length
    };
}

/**
 * Sleep utility for delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Exponential backoff retry logic
 */
async function retryWithBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
        retryableStatuses = [408, 429, 500, 502, 503, 504],
        onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();

            // Check if response indicates we should retry
            if (result.response && retryableStatuses.includes(result.response.status)) {
                throw new Error(`Retryable status: ${result.response.status}`);
            }

            return result;

        } catch (error) {
            lastError = error;

            // Check if error is retryable
            const isRetryable =
                retryableStatuses.some(status => error.message.includes(status.toString())) ||
                error.message.includes('ECONNRESET') ||
                error.message.includes('ETIMEDOUT') ||
                error.message.includes('ENOTFOUND');

            if (!isRetryable || attempt === maxRetries) {
                throw error;
            }

            // Calculate delay with jitter to avoid thundering herd
            const jitter = Math.random() * 0.3 * delay; // ±30% jitter
            const actualDelay = Math.min(delay + jitter, maxDelay);

            if (onRetry) {
                onRetry({
                    attempt: attempt + 1,
                    maxRetries,
                    delay: actualDelay,
                    error: error.message
                });
            }

            await sleep(actualDelay);
            delay *= backoffMultiplier;
        }
    }

    throw lastError;
}

/**
 * Make an authenticated API call with retry and rate limiting
 */
async function makeAuthenticatedCall(userId, provider, endpoint, options = {}) {
    const {
        method = 'GET',
        body = null,
        headers = {},
        retryOptions = {},
        skipRateLimit = false
    } = options;

    // Check rate limit
    if (!skipRateLimit) {
        const rateLimitCheck = checkRateLimit(provider, endpoint);
        if (!rateLimitCheck.allowed) {
            return {
                success: false,
                error: 'RATE_LIMIT_EXCEEDED',
                retryAfter: rateLimitCheck.retryAfter,
                message: rateLimitCheck.message
            };
        }
    }

    // Get OAuth token
    const token = await OAuthToken.findOne({
        where: { userId, provider }
    });

    if (!token) {
        return {
            success: false,
            error: 'NO_TOKEN',
            message: `No OAuth token found for ${provider}`
        };
    }

    // Check if token is expired
    const now = new Date();
    const expired = token.expiresAt && new Date(token.expiresAt) < now;

    if (expired) {
        return {
            success: false,
            error: 'TOKEN_EXPIRED',
            message: `Token expired at ${token.expiresAt}`,
            suggestion: 'Use token refresh tool'
        };
    }

    const accessToken = decrypt(token.accessTokenEncrypted);

    // Make the API call with retry logic
    const retryLogs = [];

    try {
        const result = await retryWithBackoff(
            async () => {
                const response = await fetch(endpoint, {
                    method,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        ...headers
                    },
                    body: body ? JSON.stringify(body) : undefined
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    return {
                        success: false,
                        response,
                        statusCode: response.status,
                        error: data,
                        headers: Object.fromEntries(response.headers.entries())
                    };
                }

                return {
                    success: true,
                    statusCode: response.status,
                    data,
                    headers: Object.fromEntries(response.headers.entries())
                };
            },
            {
                ...retryOptions,
                onRetry: (info) => {
                    retryLogs.push(info);
                    console.log(`🔄 Retry attempt ${info.attempt}/${info.maxRetries} for ${provider} ${endpoint}`);
                }
            }
        );

        return {
            ...result,
            provider,
            endpoint,
            retries: retryLogs.length,
            retryLog: retryLogs
        };

    } catch (error) {
        return {
            success: false,
            error: 'API_CALL_FAILED',
            message: error.message,
            provider,
            endpoint,
            retries: retryLogs.length,
            retryLog: retryLogs
        };
    }
}

/**
 * Batch API calls with intelligent queuing
 */
async function batchApiCalls(calls, options = {}) {
    const {
        concurrency = 3,
        delayBetweenBatches = 1000
    } = options;

    const results = [];
    const batches = [];

    // Group calls into batches
    for (let i = 0; i < calls.length; i += concurrency) {
        batches.push(calls.slice(i, i + concurrency));
    }

    for (const [index, batch] of batches.entries()) {
        console.log(`Processing batch ${index + 1}/${batches.length}`);

        const batchResults = await Promise.allSettled(
            batch.map(call =>
                makeAuthenticatedCall(
                    call.userId,
                    call.provider,
                    call.endpoint,
                    call.options
                )
            )
        );

        results.push(...batchResults.map((result, i) => ({
            ...batch[i],
            result: result.status === 'fulfilled' ? result.value : { error: result.reason }
        })));

        // Delay between batches to respect rate limits
        if (index < batches.length - 1) {
            await sleep(delayBetweenBatches);
        }
    }

    const successful = results.filter(r => r.result.success).length;
    const failed = results.length - successful;

    return {
        total: results.length,
        successful,
        failed,
        results
    };
}

/**
 * Get rate limit status for a provider
 */
function getRateLimitStatus(provider) {
    const providerLimits = Array.from(rateLimits.entries())
        .filter(([key]) => key.startsWith(provider))
        .map(([key, value]) => {
            const endpoint = key.split(':')[1];
            return {
                endpoint,
                requestsInWindow: value.requests.length,
                resetAt: new Date(value.resetAt)
            };
        });

    return {
        provider,
        endpoints: providerLimits,
        timestamp: new Date()
    };
}

/**
 * Clear rate limits (useful for testing or manual reset)
 */
function clearRateLimits(provider = null) {
    if (provider) {
        const keys = Array.from(rateLimits.keys()).filter(k => k.startsWith(provider));
        keys.forEach(key => rateLimits.delete(key));
        return { cleared: keys.length, provider };
    } else {
        const count = rateLimits.size;
        rateLimits.clear();
        return { cleared: count, provider: 'all' };
    }
}

module.exports = {
    makeAuthenticatedCall,
    retryWithBackoff,
    batchApiCalls,
    checkRateLimit,
    getRateLimitStatus,
    clearRateLimits
};
