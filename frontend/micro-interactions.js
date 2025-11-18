/**
 * Micro-Interactions & Animations for Athlytx Dashboard
 *
 * Features:
 * - Button scale on click with ripple effects
 * - Icon rotation (refresh button)
 * - Success/error animations
 * - Shimmer on data update
 * - Tab switching animations
 * - Card tilt effects
 * - Status pulse rings
 * - Event delegation for performance
 * - Auto-integration with existing functions
 * - GPU-accelerated (transform/opacity only)
 * - Accessibility (prefers-reduced-motion support)
 * - Mobile-optimized
 */

(function() {
    'use strict';

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ===== RIPPLE EFFECT =====
    function createRipple(event) {
        if (prefersReducedMotion) return;

        const button = event.currentTarget;

        // Don't add ripple if button has data-no-ripple attribute
        if (button.hasAttribute('data-no-ripple')) return;

        const ripple = document.createElement('span');
        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        ripple.className = 'ripple';

        // Remove any existing ripples
        const existingRipple = button.querySelector('.ripple');
        if (existingRipple) {
            existingRipple.remove();
        }

        button.appendChild(ripple);

        // Remove ripple after animation
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }

    // ===== BUTTON SCALE ANIMATION =====
    function addButtonScaleEffect() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button, .connect-btn, .disconnect-btn, .refresh-btn, .nav-tab');
            if (button && !prefersReducedMotion) {
                button.classList.add('btn-scale-click');
                setTimeout(() => {
                    button.classList.remove('btn-scale-click');
                }, 200);
            }
        }, true);
    }

    // ===== ICON ROTATION =====
    function addIconRotation() {
        const refreshBtns = document.querySelectorAll('.refresh-btn');
        refreshBtns.forEach(btn => {
            const icon = btn.textContent.includes('🔄') ? '🔄' : null;
            if (icon && !prefersReducedMotion) {
                btn.addEventListener('click', function() {
                    this.classList.add('icon-rotate-active');
                    setTimeout(() => {
                        this.classList.remove('icon-rotate-active');
                    }, 600);
                });
            }
        });
    }

    // ===== SHIMMER EFFECT ON DATA UPDATE =====
    function addShimmerEffect(element) {
        if (prefersReducedMotion || !element) return;

        element.classList.add('shimmer-effect');
        setTimeout(() => {
            element.classList.remove('shimmer-effect');
        }, 1500);
    }

    // ===== SUCCESS CHECKMARK ANIMATION =====
    function showSuccessAnimation(button) {
        if (prefersReducedMotion || !button) return;

        const checkmark = document.createElement('div');
        checkmark.className = 'success-checkmark';
        checkmark.innerHTML = `
            <svg class="checkmark-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
        `;

        button.style.position = 'relative';
        button.appendChild(checkmark);

        setTimeout(() => {
            checkmark.remove();
        }, 1200);
    }

    // ===== ERROR SHAKE ANIMATION =====
    function showErrorAnimation(element) {
        if (prefersReducedMotion || !element) return;

        element.classList.add('shake-error');
        setTimeout(() => {
            element.classList.remove('shake-error');
        }, 600);
    }

    // ===== PULSE RING ANIMATION =====
    function addPulseRing(element) {
        if (prefersReducedMotion || !element) return;

        const ring = document.createElement('div');
        ring.className = 'pulse-ring';

        element.style.position = 'relative';
        element.appendChild(ring);

        setTimeout(() => {
            ring.remove();
        }, 1500);
    }

    // ===== CARD TILT EFFECT =====
    function addCardTiltEffect() {
        if (prefersReducedMotion) return;

        const cards = document.querySelectorAll('.device-card, .analytics-card, .summary-card');

        cards.forEach(card => {
            card.classList.add('card-tilt');

            card.addEventListener('mousemove', (e) => {
                if (window.matchMedia('(hover: hover)').matches) {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;

                    // Very subtle tilt - barely noticeable
                    const rotateX = (y - centerY) / 200; // Changed from /20 to /200 (10x more subtle)
                    const rotateY = (centerX - x) / 200; // Changed from /20 to /200 (10x more subtle)

                    card.style.transform = `perspective(2000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.005, 1.005, 1.005)`; // Barely noticeable scale
                }
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
            });
        });
    }

    // ===== TAB SWITCHING ANIMATION =====
    function addTabSwitchAnimation() {
        // Tab animations are handled by CSS - no wrapping needed
        // The switchTab function in index.html handles everything
        console.log('Tab switching uses CSS animations');
    }

    // ===== WRAP EXISTING FUNCTIONS WITH ANIMATIONS =====
    function wrapExistingFunctions() {
        // Wrap connectDevice with success animation
        const originalConnectDevice = window.connectDevice;
        if (typeof originalConnectDevice === 'function') {
            window.connectDevice = async function(device) {
                const button = event.target;

                // Add loading shimmer
                if (button) {
                    addShimmerEffect(button);
                }

                try {
                    const result = await originalConnectDevice.call(this, device);

                    // Show success animation
                    if (button) {
                        showSuccessAnimation(button);
                    }

                    return result;
                } catch (error) {
                    // Show error animation
                    if (button) {
                        showErrorAnimation(button);
                    }
                    throw error;
                }
            };
        }

        // Wrap refreshAllData with shimmer
        const originalRefreshAllData = window.refreshAllData;
        if (typeof originalRefreshAllData === 'function') {
            window.refreshAllData = async function() {
                const refreshBtn = document.querySelector('.refresh-btn');

                // Add shimmer to all data cards
                const dataCards = document.querySelectorAll('.analytics-card, .summary-card');
                dataCards.forEach(card => addShimmerEffect(card));

                // Add rotation to refresh button
                if (refreshBtn && !prefersReducedMotion) {
                    refreshBtn.classList.add('icon-rotate-active');
                }

                try {
                    const result = await originalRefreshAllData.call(this);

                    // Remove rotation
                    if (refreshBtn) {
                        setTimeout(() => {
                            refreshBtn.classList.remove('icon-rotate-active');
                        }, 600);
                    }

                    return result;
                } catch (error) {
                    // Show error on refresh button
                    if (refreshBtn) {
                        refreshBtn.classList.remove('icon-rotate-active');
                        showErrorAnimation(refreshBtn);
                    }
                    throw error;
                }
            };
        }

        // Wrap showMessage with entrance animation
        const originalShowMessage = window.showMessage;
        if (typeof originalShowMessage === 'function') {
            window.showMessage = function(message, type = 'info') {
                const result = originalShowMessage.call(this, message, type);

                // Find the newly created message
                setTimeout(() => {
                    const messages = document.querySelectorAll('.status-message');
                    const latestMessage = messages[messages.length - 1];

                    if (latestMessage && !prefersReducedMotion) {
                        // Removed pulse ring for success messages to eliminate green flash
                        // Just let the message fade naturally

                        // Add shake for error messages
                        if (type === 'error') {
                            showErrorAnimation(latestMessage);
                        }
                    }
                }, 50);

                return result;
            };
        }
    }

    // ===== AUTO-ADD RIPPLE TO ALL BUTTONS =====
    function initializeRippleEffect() {
        // Use event delegation for better performance
        document.addEventListener('mousedown', (e) => {
            const button = e.target.closest('button, .connect-btn, .disconnect-btn, .refresh-btn, .nav-tab');
            if (button) {
                createRipple(e);
            }
        });
    }

    // ===== OBSERVE DOM CHANGES FOR NEW ELEMENTS =====
    function observeDOMChanges() {
        if (prefersReducedMotion) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        // Add tilt to new cards
                        if (node.matches && (node.matches('.device-card') || node.matches('.analytics-card') || node.matches('.summary-card'))) {
                            addCardTiltEffect();
                        }

                        // Add rotation to new refresh buttons
                        if (node.matches && node.matches('.refresh-btn')) {
                            addIconRotation();
                        }

                        // Fade in new tab content
                        if (node.matches && node.matches('.tab-content')) {
                            node.style.opacity = '0';
                            node.style.transform = 'translateY(10px)';
                            setTimeout(() => {
                                node.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                                node.style.opacity = '1';
                                node.style.transform = 'translateY(0)';
                            }, 50);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ===== INITIALIZE ALL ANIMATIONS =====
    function initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        function init() {
            console.log('🎨 Micro-interactions initialized', prefersReducedMotion ? '(reduced motion mode)' : '');

            addButtonScaleEffect();
            addIconRotation();
            addCardTiltEffect();
            addTabSwitchAnimation();
            initializeRippleEffect();
            wrapExistingFunctions();
            observeDOMChanges();

            // Add loaded class to body for CSS animations
            document.body.classList.add('animations-loaded');
        }
    }

    // ===== EXPOSE PUBLIC API =====
    window.MicroInteractions = {
        showSuccess: showSuccessAnimation,
        showError: showErrorAnimation,
        addShimmer: addShimmerEffect,
        addPulse: addPulseRing,
        createRipple: createRipple
    };

    // Auto-initialize
    initialize();

})();
