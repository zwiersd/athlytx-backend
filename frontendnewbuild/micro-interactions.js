/**
 * ATHLYTX MICRO-INTERACTIONS
 * Subtle animations and interactions for a premium, polished feel
 * Version: 1.0.0
 */

// ===== MICRO-INTERACTIONS & ANIMATIONS =====

// Ripple effect for buttons
document.addEventListener('DOMContentLoaded', function() {
    // Add ripple effect to all buttons with ripple-container class
    document.querySelectorAll('.ripple-container').forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            this.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        });
    });

    // Add success animation to connection status badges
    const originalUpdateConnectionStatus = window.updateConnectionStatus;
    if (typeof originalUpdateConnectionStatus === 'function') {
        window.updateConnectionStatus = function() {
            originalUpdateConnectionStatus.apply(this, arguments);

            // Add success animation to newly connected badges
            document.querySelectorAll('.connection-badge.connected').forEach(badge => {
                if (!badge.classList.contains('animation-triggered')) {
                    badge.classList.add('animation-triggered', 'success-bounce');
                    setTimeout(() => badge.classList.remove('success-bounce'), 600);
                }
            });
        };
    }

    // Add celebration animation on device connection
    const originalConnectDevice = window.connectDevice;
    if (typeof originalConnectDevice === 'function') {
        window.connectDevice = function(device) {
            const deviceCard = document.querySelector(`.device-card .device-icon.${device}`);
            if (deviceCard) {
                deviceCard.closest('.device-card').classList.add('celebrate');
                setTimeout(() => {
                    deviceCard.closest('.device-card').classList.remove('celebrate');
                }, 500);
            }
            return originalConnectDevice.apply(this, arguments);
        };
    }

    // Smooth tab transitions with indicator animation
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // Add active to clicked tab
            this.classList.add('active');
        });
    });

    // Add fade-in animation to tab panels when they become active
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'class') {
                const target = mutation.target;
                if (target.classList.contains('tab-panel') && target.classList.contains('active')) {
                    if (!target.classList.contains('fade-in-up')) {
                        target.classList.add('fade-in-up');
                    }
                    // Remove and re-add to restart animation
                    target.style.animation = 'none';
                    setTimeout(() => {
                        target.style.animation = '';
                    }, 10);
                }
            }
        });
    });

    // Observe all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        observer.observe(panel, { attributes: true });
    });

    // Add loading pulse to loading spinners
    document.querySelectorAll('.loading-spinner').forEach(spinner => {
        if (!spinner.classList.contains('loading-pulse')) {
            spinner.classList.add('loading-pulse');
        }
    });

    // Performance optimization: Remove will-change after animations complete
    document.querySelectorAll('.fade-in-up, .stagger-animation > *, .chart-container').forEach(element => {
        element.addEventListener('animationend', function() {
            this.classList.add('animation-complete');
        }, { once: true });
    });

    // Add shimmer effect when data is being updated
    const addShimmerOnUpdate = (element) => {
        if (element && !element.classList.contains('shimmer')) {
            element.classList.add('shimmer');
            setTimeout(() => {
                element.classList.remove('shimmer');
            }, 2000);
        }
    };

    // Wrap data update functions to add shimmer effect
    const originalRefreshAllData = window.refreshAllData;
    if (typeof originalRefreshAllData === 'function') {
        window.refreshAllData = function() {
            // Add shimmer to all analytics cards during refresh
            document.querySelectorAll('.analytics-card, .summary-card').forEach(card => {
                addShimmerOnUpdate(card);
            });
            return originalRefreshAllData.apply(this, arguments);
        };
    }

    // Add error shake animation to error states
    document.querySelectorAll('.error-state').forEach(errorEl => {
        if (!errorEl.classList.contains('shake')) {
            errorEl.classList.add('shake');
        }
    });

    // Smooth color transitions for status indicators
    document.querySelectorAll('.connection-badge, .status-indicator').forEach(indicator => {
        if (!indicator.classList.contains('smooth-bg-transition')) {
            indicator.classList.add('smooth-bg-transition');
        }
    });
});
