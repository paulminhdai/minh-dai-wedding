// Wedding Website JavaScript
// Modular design using IIFE pattern for clean namespacing

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        weddingDate: new Date('2026-06-26T00:00:00-07:00'),
        apiEndpoint: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
            ? '/api/rsvp' 
            : '/.netlify/functions/rsvp',
        debounceDelay: 300,
        lazyLoadOffset: 100
    };

    // Utility functions
    const Utils = {
        // Debounce function for performance
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        // Sanitize input for XSS prevention
        sanitizeInput(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        },

        // Check if reduced motion is preferred
        prefersReducedMotion() {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        // Smooth scroll with reduced motion respect
        smoothScroll(target) {
            if (this.prefersReducedMotion()) {
                target.scrollIntoView();
            } else {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        },

        // Format time with leading zeros
        padTime(num) {
            return num.toString().padStart(2, '0');
        }
    };

    // Theme Management
    const ThemeManager = {
        init() {
            this.themeToggle = document.querySelector('.theme-toggle');
            
            // Load saved preferences
            this.loadTheme();
            
            // Set up event listeners
            this.themeToggle?.addEventListener('click', () => this.toggleTheme());
            
            // Listen for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)')
                .addEventListener('change', (e) => {
                    if (!localStorage.getItem('theme')) {
                        this.setTheme(e.matches ? 'dark' : 'light');
                    }
                });
        },

        loadTheme() {
            const savedTheme = localStorage.getItem('theme');
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
            this.setTheme(theme);
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            this.updateThemeToggle(theme);
        },

        toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        },

        updateThemeToggle(theme) {
            if (this.themeToggle) {
                this.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
                this.themeToggle.setAttribute('aria-label', 
                    `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
            }
        }
    };

    // Music Management
    const MusicManager = {
        init() {
            this.musicToggle = document.querySelector('.music-toggle');
            this.audioElement = document.getElementById('backgroundMusic');
            this.isPlaying = false;
            
            // Set initial volume to be subtle
            if (this.audioElement) {
                this.audioElement.volume = 0.3;
            }
            
            // Load saved preference
            this.loadMusicPreference();
            
            // Set up event listeners
            this.musicToggle?.addEventListener('click', () => this.toggleMusic());
            
            // Handle audio events
            if (this.audioElement) {
                this.audioElement.addEventListener('ended', () => this.handleMusicEnd());
                this.audioElement.addEventListener('error', () => this.handleMusicError());
            }
        },

        loadMusicPreference() {
            const savedPreference = localStorage.getItem('backgroundMusic');
            // Default to off for better UX (autoplay policies)
            this.isPlaying = savedPreference === 'true';
            this.updateMusicToggle();
        },

        toggleMusic() {
            if (!this.audioElement) return;
            
            if (this.isPlaying) {
                this.pauseMusic();
            } else {
                this.playMusic();
            }
        },

        async playMusic() {
            if (!this.audioElement) return;
            
            try {
                await this.audioElement.play();
                this.isPlaying = true;
                this.updateMusicToggle();
                localStorage.setItem('backgroundMusic', 'true');
            } catch (error) {
                console.log('Could not play background music:', error);
                this.handleMusicError();
            }
        },

        pauseMusic() {
            if (!this.audioElement) return;
            
            this.audioElement.pause();
            this.isPlaying = false;
            this.updateMusicToggle();
            localStorage.setItem('backgroundMusic', 'false');
        },

        updateMusicToggle() {
            if (this.musicToggle) {
                this.musicToggle.textContent = this.isPlaying ? '🔇' : '🎵';
                this.musicToggle.setAttribute('aria-label', 
                    this.isPlaying ? 'Pause background music' : 'Play background music');
                this.musicToggle.classList.toggle('playing', this.isPlaying);
            }
        },

        handleMusicEnd() {
            // Music naturally ended (though it should loop)
            this.isPlaying = false;
            this.updateMusicToggle();
        },

        handleMusicError() {
            console.log('Background music not available');
            this.isPlaying = false;
            this.updateMusicToggle();
            // Hide the music toggle if there's a persistent error
            if (this.musicToggle) {
                this.musicToggle.style.display = 'none';
            }
        }
    };

    // Navigation Management
    const Navigation = {
        init() {
            this.nav = document.querySelector('.nav');
            this.navToggle = document.querySelector('.nav__toggle');
            this.navMenu = document.querySelector('.nav__menu');
            this.navLinks = document.querySelectorAll('.nav__link');

            // Set up event listeners
            this.navToggle?.addEventListener('click', () => this.toggleMenu());
            this.navLinks.forEach(link => {
                link.addEventListener('click', (e) => this.handleLinkClick(e));
            });

            // Close menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.navMenu?.classList.contains('active')) {
                    this.closeMenu();
                }
            });

            // Close menu on outside click
            document.addEventListener('click', (e) => {
                if (!this.nav?.contains(e.target) && this.navMenu?.classList.contains('active')) {
                    this.closeMenu();
                }
            });
        },

        toggleMenu() {
            this.navMenu?.classList.toggle('active');
            const isOpen = this.navMenu?.classList.contains('active');
            
            // Update toggle button accessibility
            this.navToggle?.setAttribute('aria-expanded', isOpen);
            
            // Manage focus trap
            if (isOpen) {
                this.trapFocus();
            }
        },

        closeMenu() {
            this.navMenu?.classList.remove('active');
            this.navToggle?.setAttribute('aria-expanded', 'false');
        },

        handleLinkClick(e) {
            const href = e.target.getAttribute('href');
            
            // Handle internal anchor links
            if (href?.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    Utils.smoothScroll(target);
                    this.closeMenu();
                }
            }
        },

        trapFocus() {
            const focusableElements = this.navMenu?.querySelectorAll(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements?.[0];
            const lastElement = focusableElements?.[focusableElements.length - 1];

            const handleTabKey = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement?.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement?.focus();
                        }
                    }
                }
            };

            if (this.navMenu?.classList.contains('active')) {
                document.addEventListener('keydown', handleTabKey);
                firstElement?.focus();
            }
        }
    };

    // Countdown Timer
    const Countdown = {
        init() {
            this.countdownEl = document.getElementById('countdown-text');
            
            if (this.countdownEl) {
                this.updateCountdown();
                this.interval = setInterval(() => this.updateCountdown(), 60000); // Update every minute
            }
        },

        updateCountdown() {
            const now = new Date().getTime();
            const weddingTime = CONFIG.weddingDate.getTime();
            const difference = weddingTime - now;

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                
                if (days === 0) {
                    this.countdownEl.textContent = "Today is the day! 🎉";
                } else if (days === 1) {
                    this.countdownEl.textContent = "1 day to go";
                } else {
                    this.countdownEl.textContent = `${days} days to go`;
                }
            } else {
                // Wedding day has passed
                this.countdownEl.textContent = "Just married! 💕";
                clearInterval(this.interval);
            }
        },

        destroy() {
            if (this.interval) {
                clearInterval(this.interval);
            }
        }
    };

    // RSVP Form Management
    const RSVPForm = {
        init() {
            this.form = document.getElementById('rsvpForm');
            this.feedback = document.querySelector('.form__feedback');
            this.attendingFields = document.getElementById('attendingFields');
            this.submitCount = 0;
            this.lastSubmitTime = 0;
            this.isSubmitting = false;

            if (this.form) {
                this.setupEventListeners();
                this.setupValidation();
                this.setupMobileOptimizations();
            }
        },

        setupMobileOptimizations() {
            if (!MobileUtils.isMobile()) return;

            // Add mobile loading class for better visual feedback
            const submitBtn = this.form.querySelector('.form__submit');
            if (submitBtn) {
                submitBtn.addEventListener('touchstart', () => {
                    submitBtn.classList.add('mobile-touch');
                }, { passive: true });

                submitBtn.addEventListener('touchend', () => {
                    setTimeout(() => {
                        submitBtn.classList.remove('mobile-touch');
                    }, 150);
                }, { passive: true });
            }

            // Improve mobile form validation feedback
            const inputs = this.form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                // Add mobile-friendly focus handling
                input.addEventListener('focus', () => {
                    // Scroll form into view on mobile when focused
                    if (MobileUtils.isMobile()) {
                        setTimeout(() => {
                            input.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                            });
                        }, 300); // Wait for virtual keyboard
                    }
                });

                // Better mobile input validation
                input.addEventListener('blur', () => {
                    this.validateField(input);
                    // Hide keyboard helper text on blur
                    this.hideKeyboardHelper();
                });
            });

            // Add keyboard helper for mobile users
            this.setupKeyboardHelper();

            // Handle orientation changes
            window.addEventListener('orientationchange', () => {
                setTimeout(() => {
                    this.handleOrientationChange();
                }, 500);
            });
        },

        setupKeyboardHelper() {
            if (!MobileUtils.isMobile()) return;

            // Create helper for mobile keyboard navigation
            const helper = document.createElement('div');
            helper.className = 'mobile-keyboard-helper';
            helper.innerHTML = `
                <span>💡 Tip: Swipe down to dismiss keyboard</span>
            `;
            helper.style.cssText = `
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: var(--accent-sage);
                color: white;
                padding: var(--space-sm);
                text-align: center;
                font-size: 0.875rem;
                transform: translateY(100%);
                transition: transform 0.3s ease;
                z-index: 1000;
                display: none;
            `;
            document.body.appendChild(helper);
            this.keyboardHelper = helper;

            // Show helper when keyboard appears
            const formInputs = this.form.querySelectorAll('input, textarea, select');
            formInputs.forEach(input => {
                input.addEventListener('focus', () => {
                    if (MobileUtils.isMobile()) {
                        this.showKeyboardHelper();
                    }
                });
            });
        },

        showKeyboardHelper() {
            if (this.keyboardHelper) {
                this.keyboardHelper.style.display = 'block';
                setTimeout(() => {
                    this.keyboardHelper.style.transform = 'translateY(0)';
                }, 100);

                // Auto-hide after 3 seconds
                setTimeout(() => {
                    this.hideKeyboardHelper();
                }, 3000);
            }
        },

        hideKeyboardHelper() {
            if (this.keyboardHelper) {
                this.keyboardHelper.style.transform = 'translateY(100%)';
                setTimeout(() => {
                    this.keyboardHelper.style.display = 'none';
                }, 300);
            }
        },

        handleOrientationChange() {
            // Re-scroll to active element after orientation change
            const activeElement = document.activeElement;
            if (activeElement && this.form.contains(activeElement)) {
                activeElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        },

        setupEventListeners() {
            // Handle attending radio buttons
            const attendingRadios = this.form.querySelectorAll('input[name="attending"]');
            attendingRadios.forEach(radio => {
                radio.addEventListener('change', () => this.toggleAttendingFields());
            });

            // Form submission
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));

            // Real-time validation
            const inputs = this.form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', Utils.debounce(() => this.validateField(input), CONFIG.debounceDelay));
            });
        },

        setupValidation() {
            // Custom validation messages
            this.validationMessages = {
                names: 'Please enter your name(s)',
                phone: 'Please enter a valid phone number',
                attending: 'Please let us know if you\'ll be attending'
            };
        },

        toggleAttendingFields() {
            const attendingYes = this.form.querySelector('input[name="attending"][value="yes"]');
            if (attendingYes?.checked) {
                this.attendingFields?.classList.add('show');
            } else {
                this.attendingFields?.classList.remove('show');
                // Clear the fields when not attending
                const guestSelect = this.form.querySelector('#guests');
                const dietaryField = this.form.querySelector('#dietary');
                const messageField = this.form.querySelector('#message');
                
                if (guestSelect) guestSelect.value = '';
                if (dietaryField) dietaryField.value = '';
                if (messageField) messageField.value = '';
            }
        },

        validateField(field) {
            const value = field.value.trim();
            let isValid = true;
            let message = '';

            // Remove existing error styling
            field.classList.remove('error');
            this.removeFieldError(field);

            // Validate based on field type
            switch (field.name) {
                case 'names':
                    isValid = value.length > 0;
                    message = this.validationMessages.names;
                    break;
                case 'phone':
                    // Remove all non-digit characters for validation
                    const digits = value.replace(/\D/g, '');
                    isValid = value.length === 0 || (digits.length >= 10 && digits.length <= 11);
                    if (field.required && value.length === 0) {
                        isValid = false;
                        message = 'Phone number is required';
                    } else if (digits.length < 10 || digits.length > 11) {
                        isValid = false;
                        message = this.validationMessages.phone;
                    }
                    break;
                case 'attending':
                    const attendingChecked = this.form.querySelector('input[name="attending"]:checked');
                    isValid = !!attendingChecked;
                    message = this.validationMessages.attending;
                    break;
            }

            if (!isValid) {
                this.showFieldError(field, message);
            }

            return isValid;
        },

        showFieldError(field, message) {
            field.classList.add('error');
            
            // Remove existing error message
            this.removeFieldError(field);
            
            // Add new error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = message;
            errorDiv.setAttribute('role', 'alert');
            
            field.parentNode.appendChild(errorDiv);
        },

        removeFieldError(field) {
            const existingError = field.parentNode.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }
        },

        async handleSubmit(e) {
            e.preventDefault();

            // Rate limiting check
            const now = Date.now();
            if (now - this.lastSubmitTime < 5000) { // 5 second cooldown
                this.showFeedback('Please wait a moment before submitting again.', 'error');
                return;
            }

            // Basic spam protection
            if (this.submitCount > 3) {
                this.showFeedback('Too many submission attempts. Please refresh the page.', 'error');
                return;
            }

            // Validate all fields
            const requiredFields = this.form.querySelectorAll('[required]');
            let isFormValid = true;

            requiredFields.forEach(field => {
                if (!this.validateField(field)) {
                    isFormValid = false;
                }
            });

            // Check if attending is selected
            const attendingChecked = this.form.querySelector('input[name="attending"]:checked');
            if (!attendingChecked) {
                isFormValid = false;
                this.showFieldError(this.form.querySelector('input[name="attending"]'), this.validationMessages.attending);
            }

            if (!isFormValid) {
                this.showFeedback('Please correct the errors above.', 'error');
                return;
            }

            // Prepare form data
            const formData = new FormData(this.form);
            const data = {
                names: Utils.sanitizeInput(formData.get('names')),
                phone: Utils.sanitizeInput(formData.get('phone')),
                attending: formData.get('attending'),
                timestamp: new Date().toISOString()
            };

            // Add additional fields if attending
            if (data.attending === 'yes') {
                data.guests = parseInt(formData.get('guests')) || 1;
                if (formData.get('dietary')) {
                    data.dietary = Utils.sanitizeInput(formData.get('dietary'));
                }
                if (formData.get('message')) {
                    data.message = Utils.sanitizeInput(formData.get('message'));
                }
            }

            // Show loading state
            const submitBtn = this.form.querySelector('.form__submit');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            this.form.classList.add('loading');

            try {
                const response = await fetch(CONFIG.apiEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (response.ok) {
                    this.showFeedback(result.message || 'Thank you for your RSVP!', 'success');
                    this.form.reset();
                    this.attendingFields?.classList.remove('show');
                } else {
                    this.showFeedback(result.error || 'Something went wrong. Please try again.', 'error');
                }
            } catch (error) {
                console.error('RSVP submission error:', error);
                this.showFeedback('Network error. Please check your connection and try again.', 'error');
            } finally {
                // Reset button state
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
                this.form.classList.remove('loading');
                
                // Update rate limiting
                this.submitCount++;
                this.lastSubmitTime = now;
            }
        },

        showFeedback(message, type) {
            if (this.feedback) {
                this.feedback.textContent = message;
                this.feedback.className = `form__feedback ${type}`;
                this.feedback.setAttribute('aria-live', 'polite');
                
                // Auto-hide success messages
                if (type === 'success') {
                    setTimeout(() => {
                        this.feedback.textContent = '';
                        this.feedback.className = 'form__feedback';
                    }, 5000);
                }
            }
        }
    };

    // Lazy Loading for Images
    const LazyLoader = {
        init() {
            this.images = document.querySelectorAll('img[loading="lazy"]');
            
            if ('IntersectionObserver' in window) {
                this.observer = new IntersectionObserver(
                    (entries) => this.handleIntersection(entries),
                    {
                        rootMargin: `${CONFIG.lazyLoadOffset}px`
                    }
                );

                this.images.forEach(img => this.observer.observe(img));
            } else {
                // Fallback for older browsers
                this.images.forEach(img => this.loadImage(img));
            }
        },

        handleIntersection(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        },

        loadImage(img) {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
            }
            
            img.addEventListener('load', () => {
                img.classList.add('loaded');
            });

            img.addEventListener('error', () => {
                img.alt = 'Image failed to load';
                img.classList.add('error');
            });
        }
    };

    // Mobile Detection Utility
    const MobileUtils = {
        isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        },
        
        isMobile() {
            return window.innerWidth <= 768;
        },
        
        isIOS() {
            return /iPad|iPhone|iPod/.test(navigator.userAgent);
        },
        
        isAndroid() {
            return /Android/.test(navigator.userAgent);
        },
        
        // Debounced resize handler for mobile optimization
        handleResize: Utils.debounce(() => {
            // Trigger mobile layout adjustments
            if (MobileUtils.isMobile()) {
                document.body.classList.add('mobile');
            } else {
                document.body.classList.remove('mobile');
            }
        }, 250)
    };

    // Touch Gesture Handler
    const TouchGesture = {
        init() {
            this.startX = 0;
            this.startY = 0;
            this.endX = 0;
            this.endY = 0;
            this.minSwipeDistance = 50;
            this.maxVerticalDistance = 100;
            this.isScrolling = false;
        },

        start(e) {
            this.startX = e.touches[0].clientX;
            this.startY = e.touches[0].clientY;
            this.isScrolling = false;
        },

        move(e) {
            if (!this.startX || !this.startY) return;

            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = Math.abs(currentX - this.startX);
            const diffY = Math.abs(currentY - this.startY);

            // Determine if user is scrolling vertically
            if (diffY > diffX) {
                this.isScrolling = true;
            }
        },

        end(e) {
            if (this.isScrolling) {
                this.reset();
                return null;
            }

            this.endX = e.changedTouches[0].clientX;
            this.endY = e.changedTouches[0].clientY;

            const deltaX = this.endX - this.startX;
            const deltaY = Math.abs(this.endY - this.startY);

            // Check if it's a valid horizontal swipe
            if (Math.abs(deltaX) >= this.minSwipeDistance && deltaY <= this.maxVerticalDistance) {
                const direction = deltaX > 0 ? 'right' : 'left';
                this.reset();
                return direction;
            }

            this.reset();
            return null;
        },

        reset() {
            this.startX = 0;
            this.startY = 0;
            this.endX = 0;
            this.endY = 0;
            this.isScrolling = false;
        }
    };

    // Gallery Management
    const Gallery = {
        init() {
            this.galleryGrid = document.getElementById('galleryGrid');
            this.autoScrollInterval = null;
            this.scrollSpeed = MobileUtils.isMobile() ? 1 : 2; // Slower on mobile for battery
            this.isPaused = false;
            this.currentImageIndex = 0;
            this.images = [];
            this.touchGesture = Object.create(TouchGesture);
            this.touchGesture.init();
            
            this.loadGalleryImages();
            this.setupAutoScroll();
            this.setupMobileInteractions();
        },

        setupMobileInteractions() {
            if (!this.galleryGrid || !MobileUtils.isTouchDevice()) return;

            // Touch event handlers for mobile swipe navigation
            this.galleryGrid.addEventListener('touchstart', (e) => {
                this.touchGesture.start(e);
                this.isPaused = true; // Pause auto-scroll during touch
            }, { passive: true });

            this.galleryGrid.addEventListener('touchmove', (e) => {
                this.touchGesture.move(e);
                // Prevent default only for horizontal swipes
                if (!this.touchGesture.isScrolling) {
                    e.preventDefault();
                }
            }, { passive: false });

            this.galleryGrid.addEventListener('touchend', (e) => {
                const swipeDirection = this.touchGesture.end(e);
                
                if (swipeDirection) {
                    this.handleSwipe(swipeDirection);
                    
                    // Provide haptic feedback on supported devices
                    if (window.navigator.vibrate) {
                        window.navigator.vibrate(50);
                    }
                }
                
                // Resume auto-scroll after a delay
                setTimeout(() => {
                    this.isPaused = false;
                }, 2000);
            }, { passive: true });

            // Add visual feedback for touch interactions
            this.galleryGrid.addEventListener('touchstart', () => {
                this.galleryGrid.classList.add('touching');
            }, { passive: true });

            this.galleryGrid.addEventListener('touchend', () => {
                this.galleryGrid.classList.remove('touching');
            }, { passive: true });
        },

        handleSwipe(direction) {
            // Handle swipe navigation for mobile users
            if (direction === 'left') {
                this.scrollToNext();
            } else if (direction === 'right') {
                this.scrollToPrevious();
            }
        },

        scrollToNext() {
            const carousel = this.carousel;
            if (!carousel) return;

            const imageSet = carousel.querySelector('.gallery__image-set');
            if (imageSet) {
                const itemWidth = 280 + 16; // Item width + gap
                const maxScroll = imageSet.offsetWidth;
                let currentTransform = this.getCurrentTransform();
                
                currentTransform += itemWidth;
                if (currentTransform >= maxScroll) {
                    currentTransform = 0;
                }
                
                carousel.style.transform = `translateX(-${currentTransform}px)`;
                carousel.style.transition = 'transform 0.3s ease';
                
                // Remove transition after animation
                setTimeout(() => {
                    carousel.style.transition = '';
                }, 300);
            }
        },

        scrollToPrevious() {
            const carousel = this.carousel;
            if (!carousel) return;

            const imageSet = carousel.querySelector('.gallery__image-set');
            if (imageSet) {
                const itemWidth = 280 + 16; // Item width + gap
                const maxScroll = imageSet.offsetWidth;
                let currentTransform = this.getCurrentTransform();
                
                currentTransform -= itemWidth;
                if (currentTransform < 0) {
                    currentTransform = maxScroll - itemWidth;
                }
                
                carousel.style.transform = `translateX(-${currentTransform}px)`;
                carousel.style.transition = 'transform 0.3s ease';
                
                // Remove transition after animation
                setTimeout(() => {
                    carousel.style.transition = '';
                }, 300);
            }
        },

        getCurrentTransform() {
            const carousel = this.carousel;
            if (!carousel) return 0;
            
            const transform = carousel.style.transform;
            const match = transform.match(/translateX\((-?\d+)px\)/);
            return match ? Math.abs(parseInt(match[1])) : 0;
        },

        loadGalleryImages() {
            // Add your actual image filenames here
            const galleryImages = [
                'images/photo1.jpg',
                'images/photo2.jpg', 
                'images/photo3.jpg',
                'images/photo4.jpg',
                'images/photo5.jpg',
                'images/photo6.jpg',
                'images/photo7.jpg'
                // Add more photos as needed
            ];

            // Remove placeholder text
            const placeholder = this.galleryGrid?.querySelector('.gallery__placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Create carousel container
            const carousel = document.createElement('div');
            carousel.className = 'gallery__carousel';
            
            // Create two identical sets of images for seamless loop
            const createImageSet = () => {
                const imageSet = document.createElement('div');
                imageSet.className = 'gallery__image-set';
                
                galleryImages.forEach((src, index) => {
                    const item = document.createElement('div');
                    item.className = 'gallery__item';
                    
                    const img = document.createElement('img');
                    img.className = 'gallery__image';
                    img.src = src;
                    img.alt = `Wedding photo ${index + 1}`;
                    img.loading = 'lazy';
                    
                    // Add click handler for lightbox effect
                    img.addEventListener('click', () => {
                        this.openLightbox(src, img.alt);
                    });
                    
                    // Handle image load errors gracefully
                    img.addEventListener('error', () => {
                        item.style.display = 'none';
                    });
                    
                    item.appendChild(img);
                    imageSet.appendChild(item);
                });
                
                return imageSet;
            };

            // Add two identical sets for seamless scrolling
            carousel.appendChild(createImageSet());
            carousel.appendChild(createImageSet());
            
            this.galleryGrid.appendChild(carousel);
            this.carousel = carousel;
        },

        setupAutoScroll() {
            if (!this.carousel) return;

            // Pause on hover
            this.carousel.addEventListener('mouseenter', () => {
                this.isPaused = true;
            });

            this.carousel.addEventListener('mouseleave', () => {
                this.isPaused = false;
            });

            // Pause on focus (accessibility)
            this.carousel.addEventListener('focusin', () => {
                this.isPaused = true;
            });

            this.carousel.addEventListener('focusout', () => {
                this.isPaused = false;
            });

            // Start auto-scroll animation
            this.startAutoScroll();
        },

        startAutoScroll() {
            let scrollPosition = 0;
            
            const scroll = () => {
                if (!this.isPaused && this.carousel) {
                    scrollPosition += this.scrollSpeed;
                    
                    // Get the width of one image set
                    const imageSet = this.carousel.querySelector('.gallery__image-set');
                    if (imageSet) {
                        const setWidth = imageSet.offsetWidth;
                        
                        // Reset position when we've scrolled one full set
                        if (scrollPosition >= setWidth) {
                            scrollPosition = 0;
                        }
                        
                        // Apply transform
                        this.carousel.style.transform = `translateX(-${scrollPosition}px)`;
                    }
                }
                
                requestAnimationFrame(scroll);
            };
            
            // Start the animation
            requestAnimationFrame(scroll);
        },

        openLightbox(src, alt) {
            // Pause auto-scroll when lightbox opens
            this.isPaused = true;
            
            // Create lightbox overlay
            const lightbox = document.createElement('div');
            lightbox.className = 'lightbox';
            lightbox.innerHTML = `
                <div class="lightbox__content">
                    <img src="${src}" alt="${alt}" class="lightbox__image">
                    <button class="lightbox__close" aria-label="Close lightbox">&times;</button>
                </div>
            `;
            
            // Add close functionality
            const closeLightbox = () => {
                lightbox.remove();
                this.isPaused = false; // Resume auto-scroll
            };
            
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox || e.target.classList.contains('lightbox__close')) {
                    closeLightbox();
                }
            });
            
            // Close on Escape key
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    closeLightbox();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);
            
            document.body.appendChild(lightbox);
        }
    };

    // Service Worker Registration for Offline Support
    const ServiceWorkerManager = {
        init() {
            if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/sw.js')
                        .then(registration => {
                            console.log('SW registered: ', registration);
                        })
                        .catch(registrationError => {
                            console.log('SW registration failed: ', registrationError);
                        });
                });
            }
        }
    };

    // Analytics placeholder
    const Analytics = {
        init() {
            // TODO: Add analytics tracking code
            // Example: Google Analytics, Facebook Pixel, etc.
            console.log('Analytics initialized - placeholder for tracking code');
        },

        trackEvent(eventName, parameters = {}) {
            // TODO: Implement event tracking
            console.log('Event tracked:', eventName, parameters);
        }
    };

    // Mobile-Enhanced Navigation
    const MobileNavigation = {
        init() {
            this.setupMobileMenuAnimations();
            this.setupSwipeToClose();
            this.setupTouchFeedback();
        },

        setupMobileMenuAnimations() {
            const navMenu = document.querySelector('.nav__menu');
            const navToggle = document.querySelector('.nav__toggle');

            if (!navMenu || !navToggle) return;

            // Add mobile-specific menu animations
            navToggle.addEventListener('click', () => {
                if (MobileUtils.isMobile()) {
                    const isOpen = navMenu.classList.contains('active');
                    
                    if (isOpen) {
                        navMenu.style.animation = 'slideOutUp 0.3s ease-out forwards';
                    } else {
                        navMenu.style.animation = 'slideInDown 0.3s ease-out forwards';
                    }
                }
            });
        },

        setupSwipeToClose() {
            const navMenu = document.querySelector('.nav__menu');
            if (!navMenu || !MobileUtils.isTouchDevice()) return;

            const touchGesture = Object.create(TouchGesture);
            touchGesture.init();

            navMenu.addEventListener('touchstart', (e) => {
                touchGesture.start(e);
            }, { passive: true });

            navMenu.addEventListener('touchend', (e) => {
                const swipeDirection = touchGesture.end(e);
                
                if (swipeDirection === 'left' && navMenu.classList.contains('active')) {
                    // Close menu on left swipe
                    Navigation.closeMenu();
                    
                    // Haptic feedback
                    if (window.navigator.vibrate) {
                        window.navigator.vibrate(30);
                    }
                }
            }, { passive: true });
        },

        setupTouchFeedback() {
            const navLinks = document.querySelectorAll('.nav__link');
            
            navLinks.forEach(link => {
                link.addEventListener('touchstart', () => {
                    link.classList.add('touch-active');
                }, { passive: true });

                link.addEventListener('touchend', () => {
                    setTimeout(() => {
                        link.classList.remove('touch-active');
                    }, 150);
                }, { passive: true });
            });
        }
    };

    // Performance Monitor for Mobile
    const MobilePerformance = {
        init() {
            if (!MobileUtils.isMobile()) return;

            this.monitorBatteryLife();
            this.monitorNetworkConnection();
            this.optimizeForLowPower();
        },

        monitorBatteryLife() {
            if ('getBattery' in navigator) {
                navigator.getBattery().then((battery) => {
                    this.adjustPerformanceBasedOnBattery(battery);
                    
                    battery.addEventListener('levelchange', () => {
                        this.adjustPerformanceBasedOnBattery(battery);
                    });
                });
            }
        },

        adjustPerformanceBasedOnBattery(battery) {
            const lowBattery = battery.level < 0.2; // Less than 20%
            
            if (lowBattery) {
                // Reduce animations and auto-scroll speed
                document.body.classList.add('low-battery');
                
                // Slow down gallery auto-scroll
                if (Gallery.scrollSpeed) {
                    Gallery.scrollSpeed = 0.5;
                }
                
                // Reduce animation frequency
                const hearts = document.querySelectorAll('.heart, .star');
                hearts.forEach(element => {
                    element.style.animationDuration = '8s';
                });
            } else {
                document.body.classList.remove('low-battery');
                
                // Restore normal performance
                if (Gallery.scrollSpeed) {
                    Gallery.scrollSpeed = MobileUtils.isMobile() ? 1 : 2;
                }
            }
        },

        monitorNetworkConnection() {
            if ('connection' in navigator) {
                const connection = navigator.connection;
                
                this.adjustForConnectionSpeed(connection);
                
                connection.addEventListener('change', () => {
                    this.adjustForConnectionSpeed(connection);
                });
            }
        },

        adjustForConnectionSpeed(connection) {
            const slowConnection = connection.effectiveType === 'slow-2g' || 
                                 connection.effectiveType === '2g';
            
            if (slowConnection) {
                document.body.classList.add('slow-connection');
                
                // Disable auto-loading features
                if (Gallery.isPaused !== undefined) {
                    Gallery.isPaused = true;
                }
            } else {
                document.body.classList.remove('slow-connection');
            }
        },

        optimizeForLowPower() {
            // Detect if device is in low power mode (iOS)
            if (MobileUtils.isIOS()) {
                const testDiv = document.createElement('div');
                testDiv.style.animationName = 'test-animation';
                testDiv.style.animationDuration = '1s';
                document.body.appendChild(testDiv);
                
                setTimeout(() => {
                    const computedStyle = window.getComputedStyle(testDiv);
                    const isLowPowerMode = computedStyle.animationPlayState === 'paused';
                    
                    if (isLowPowerMode) {
                        document.body.classList.add('low-power-mode');
                        
                        // Disable all animations
                        const styleSheet = document.createElement('style');
                        styleSheet.textContent = `
                            *, *::before, *::after {
                                animation-duration: 0.01ms !important;
                                transition-duration: 0.01ms !important;
                            }
                        `;
                        document.head.appendChild(styleSheet);
                    }
                    
                    document.body.removeChild(testDiv);
                }, 100);
            }
        }
    };

    // Initialize everything when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        // Initialize mobile detection first
        MobileUtils.handleResize();
        window.addEventListener('resize', MobileUtils.handleResize);

        // Initialize core components
        ThemeManager.init();
        MusicManager.init();
        Navigation.init();
        Countdown.init();
        RSVPForm.init();
        LazyLoader.init();
        Gallery.init();
        ServiceWorkerManager.init();
        Analytics.init();

        // Initialize mobile-specific components
        if (MobileUtils.isMobile() || MobileUtils.isTouchDevice()) {
            MobileNavigation.init();
            MobilePerformance.init();
            
            // Show mobile tips
            const mobileTips = document.querySelector('.mobile-tips');
            if (mobileTips) {
                mobileTips.style.display = 'block';
            }
        }

        // Track page load with mobile info
        Analytics.trackEvent('page_view', {
            page_title: document.title,
            page_location: window.location.href,
            is_mobile: MobileUtils.isMobile(),
            is_touch_device: MobileUtils.isTouchDevice(),
            user_agent: navigator.userAgent
        });
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        Countdown.destroy();
    });

    // Handle online/offline status
    window.addEventListener('online', () => {
        document.body.classList.remove('offline');
        console.log('Back online');
    });

    window.addEventListener('offline', () => {
        document.body.classList.add('offline');
        console.log('Gone offline');
    });

    // Expose some functions globally for testing/debugging
    window.WeddingWebsite = {
        ThemeManager,
        MusicManager,
        Navigation,
        Countdown,
        RSVPForm,
        Analytics
    };

})();
