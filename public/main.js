// Wedding Website JavaScript
// Modular design using IIFE pattern for clean namespacing

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        weddingDate: new Date('2026-06-26T00:00:00-07:00'),
        apiEndpoint: '/.netlify/functions/rsvp',
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
            this.daysEl = document.getElementById('days');
            this.hoursEl = document.getElementById('hours');
            this.minutesEl = document.getElementById('minutes');
            
            if (this.daysEl && this.hoursEl && this.minutesEl) {
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
                const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

                this.daysEl.textContent = Utils.padTime(days);
                this.hoursEl.textContent = Utils.padTime(hours);
                this.minutesEl.textContent = Utils.padTime(minutes);
            } else {
                // Wedding day has passed
                this.daysEl.textContent = '000';
                this.hoursEl.textContent = '00';
                this.minutesEl.textContent = '00';
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

            if (this.form) {
                this.setupEventListeners();
                this.setupValidation();
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

    // Gallery Management
    const Gallery = {
        init() {
            this.galleryGrid = document.getElementById('galleryGrid');
            this.autoScrollInterval = null;
            this.scrollSpeed = 2; // pixels per frame - increased for faster movement
            this.isPaused = false;
            this.loadGalleryImages();
            this.setupAutoScroll();
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

    // Initialize everything when DOM is loaded
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        Navigation.init();
        Countdown.init();
        RSVPForm.init();
        LazyLoader.init();
        Gallery.init();
        ServiceWorkerManager.init();
        Analytics.init();

        // Track page load
        Analytics.trackEvent('page_view', {
            page_title: document.title,
            page_location: window.location.href
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
        Navigation,
        Countdown,
        RSVPForm,
        Analytics
    };

})();
