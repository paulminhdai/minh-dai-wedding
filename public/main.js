// Wedding Website JavaScript
// Modular design using IIFE pattern for clean namespacing

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        weddingDate: new Date('2026-06-26T00:00:00-07:00'),
        apiEndpoint: '/api/rsvp', // Always use the Express server endpoint
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

            // Setup name autocomplete
            const nameInput = this.form.querySelector('#names');
            if (nameInput) {
                this.setupNameAutocomplete(nameInput);
            }
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

        setupNameAutocomplete(input) {
            // Create autocomplete dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'autocomplete-dropdown';
            dropdown.style.display = 'none';
            
            // Position the dropdown relative to the input
            input.parentElement.style.position = 'relative';
            input.parentElement.appendChild(dropdown);
            
            let currentFocus = -1;
            let debounceTimer;
            
            // Handle input events
            input.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                const value = e.target.value.trim();
                
                if (value.length < 2) {
                    this.hideDropdown(dropdown);
                    return;
                }
                
                // Debounce the search
                debounceTimer = setTimeout(() => {
                    this.searchGuests(value, dropdown, input);
                }, 300);
            });
            
            // Handle keyboard navigation
            input.addEventListener('keydown', (e) => {
                const items = dropdown.querySelectorAll('.autocomplete-item');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    currentFocus++;
                    this.addActive(items, currentFocus);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    currentFocus--;
                    this.addActive(items, currentFocus);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentFocus > -1 && items[currentFocus]) {
                        items[currentFocus].click();
                    }
                } else if (e.key === 'Escape') {
                    this.hideDropdown(dropdown);
                    currentFocus = -1;
                }
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!input.parentElement.contains(e.target)) {
                    this.hideDropdown(dropdown);
                    currentFocus = -1;
                }
            });
            
            // Store references for later use
            this.autocompleteDropdown = dropdown;
            this.autocompleteFocus = currentFocus;
        },

        hideDropdown(dropdown) {
            if (dropdown.style.display === 'block') {
                dropdown.style.opacity = '0';
                dropdown.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    dropdown.style.display = 'none';
                }, 200);
            }
        },

        showDropdown(dropdown) {
            dropdown.style.display = 'block';
            // Force reflow for animation
            dropdown.offsetHeight;
            dropdown.style.opacity = '1';
            dropdown.style.transform = 'translateY(0)';
        },

        async searchGuests(searchTerm, dropdown, input) {
            try {
                const response = await fetch(`/api/guests/search?q=${encodeURIComponent(searchTerm)}`);
                const data = await response.json();
                
                dropdown.innerHTML = '';
                this.autocompleteFocus = -1;
                
                if (data.suggestions && data.suggestions.length > 0) {
                    data.suggestions.forEach((guest, index) => {
                        const item = document.createElement('div');
                        item.className = 'autocomplete-item';
                        // Styles are now in CSS
                        
                        // Highlight matching part - escape special regex characters
                        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
                        const highlightedName = guest.name.replace(regex, '<strong>$1</strong>');
                        
                        item.innerHTML = `
                            <div class="guest-name">${highlightedName}</div>
                            <div class="guest-info">
                                <span>${guest.side === 'bride' ? '👰 Bride\'s side' : 
                                       guest.side === 'groom' ? '🤵 Groom\'s side' : 
                                       '🤝 Mutual friend'}</span>
                            </div>
                        `;
                        
                        // Hover effects are now handled by CSS
                        
                        // Handle click
                        item.addEventListener('click', () => {
                            input.value = guest.name;
                            this.hideDropdown(dropdown);
                            this.validateField(input);
                            
                            // Trigger input event to update validation
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                        });
                        
                        dropdown.appendChild(item);
                    });
                    
                    this.showDropdown(dropdown);
                } else if (searchTerm.length >= 2) {
                    // Show no results message only if search term is long enough
                    const noResults = document.createElement('div');
                    noResults.className = 'autocomplete-no-results';
                    noResults.innerHTML = `
                        <div class="main-message">No matching guests found.</div>
                        <div class="help-message">Please enter your full name as it appears on the invitation.</div>
                    `;
                    dropdown.appendChild(noResults);
                    this.showDropdown(dropdown);
                }
            } catch (error) {
                console.error('Error searching guests:', error);
                this.hideDropdown(dropdown);
            }
        },

        addActive(items, currentFocus) {
            if (!items || items.length === 0) return false;
            
            // Remove active class from all items
            items.forEach(item => {
                item.classList.remove('autocomplete-active');
            });
            
            // Wrap around
            if (currentFocus >= items.length) currentFocus = 0;
            if (currentFocus < 0) currentFocus = items.length - 1;
            
            // Add active class to current item
            if (items[currentFocus]) {
                items[currentFocus].classList.add('autocomplete-active');
                items[currentFocus].scrollIntoView({ block: 'nearest' });
            }
            
            // Update stored focus
            this.autocompleteFocus = currentFocus;
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
                    this.showFeedback(result.message || 'Thank you for your RSVP!', 'success', data.attending);
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

        showFeedback(message, type, attending) {
            if (this.feedback) {
                this.feedback.textContent = message;
                this.feedback.className = `form__feedback ${type}`;
                this.feedback.setAttribute('aria-live', 'polite');
                
                // Trigger animations for success
                if (type === 'success') {
                    if (attending === 'yes') {
                        this.triggerFireworks();
                    } else if (attending === 'no') {
                        this.triggerSadRain();
                    }
                    
                    // Auto-hide success messages
                    setTimeout(() => {
                        this.feedback.textContent = '';
                        this.feedback.className = 'form__feedback';
                    }, 5000);
                }
            }
        },

        triggerFireworks() {
            // Create fireworks container with elegant overlay
            const fireworksContainer = document.createElement('div');
            fireworksContainer.className = 'fireworks-container';
            document.body.appendChild(fireworksContainer);

            // Elegant color palettes
            const goldPalette = ['#FFD700', '#FFA500', '#FFE5B4', '#FFFACD'];
            const silverPalette = ['#C0C0C0', '#E5E5E5', '#F5F5F5', '#FFFFFF'];
            const rosePalette = ['#FFB6C1', '#FFC0CB', '#FFDAB9', '#FFF0F5'];
            const champagnePalette = ['#F7E7CE', '#FFF8DC', '#FAEBD7', '#FFEBCD'];
            
            const palettes = [goldPalette, silverPalette, rosePalette, champagnePalette];
            
            // Create elegant firework sequences
            const sequences = [
                { delay: 0, type: 'chrysanthemum', x: 50, y: 50 },
                { delay: 800, type: 'willow', x: 30, y: 60 },
                { delay: 800, type: 'willow', x: 70, y: 60 },
                { delay: 1600, type: 'peony', x: 50, y: 70 },
                { delay: 2400, type: 'palm', x: 25, y: 55 },
                { delay: 2400, type: 'palm', x: 75, y: 55 },
                { delay: 3200, type: 'chrysanthemum', x: 40, y: 65 },
                { delay: 3200, type: 'chrysanthemum', x: 60, y: 65 },
                { delay: 4000, type: 'finale', x: 50, y: 60 }
            ];
            
            sequences.forEach(seq => {
                setTimeout(() => {
                    const palette = palettes[Math.floor(Math.random() * palettes.length)];
                    const firework = document.createElement('div');
                    firework.className = `firework firework-${seq.type}`;
                    firework.style.left = seq.x + '%';
                    firework.style.bottom = seq.y + '%';
                    
                    // Create elegant trails for launch
                    if (seq.type !== 'finale') {
                        const trail = document.createElement('div');
                        trail.className = 'firework-launch-trail';
                        trail.style.background = `linear-gradient(to top, transparent, ${palette[0]}, transparent)`;
                        firework.appendChild(trail);
                    }
                    
                    // Create sophisticated center bloom
                    const bloom = document.createElement('div');
                    bloom.className = 'firework-bloom';
                    const primaryColor = palette[0];
                    bloom.style.background = `radial-gradient(circle, ${primaryColor} 0%, transparent 70%)`;
                    bloom.style.boxShadow = `0 0 40px ${primaryColor}, 0 0 80px ${primaryColor}, 0 0 120px ${primaryColor}`;
                    firework.appendChild(bloom);
                    
                    // Type-specific particle patterns
                    if (seq.type === 'chrysanthemum') {
                        // Dense spherical burst
                        for (let i = 0; i < 48; i++) {
                            const particle = document.createElement('div');
                            particle.className = 'firework-particle particle-chrysanthemum';
                            particle.style.background = palette[i % palette.length];
                            particle.style.setProperty('--angle', (i * 7.5) + 'deg');
                            particle.style.setProperty('--delay', (i * 10) + 'ms');
                            firework.appendChild(particle);
                        }
                    } else if (seq.type === 'willow') {
                        // Drooping trails
                        for (let i = 0; i < 36; i++) {
                            const particle = document.createElement('div');
                            particle.className = 'firework-particle particle-willow';
                            particle.style.background = `linear-gradient(to bottom, ${palette[0]}, transparent)`;
                            particle.style.setProperty('--angle', (i * 10) + 'deg');
                            particle.style.height = '20px';
                            firework.appendChild(particle);
                        }
                    } else if (seq.type === 'peony') {
                        // Classic round burst with trails
                        for (let i = 0; i < 32; i++) {
                            const particle = document.createElement('div');
                            particle.className = 'firework-particle particle-peony';
                            particle.style.background = palette[Math.floor(i / 8)];
                            particle.style.setProperty('--angle', (i * 11.25) + 'deg');
                            
                            // Add glowing trail
                            const trail = document.createElement('div');
                            trail.className = 'particle-trail';
                            trail.style.background = `linear-gradient(to right, ${palette[0]}, transparent)`;
                            particle.appendChild(trail);
                            
                            firework.appendChild(particle);
                        }
                    } else if (seq.type === 'palm') {
                        // Rising comet tails
                        for (let i = 0; i < 24; i++) {
                            const particle = document.createElement('div');
                            particle.className = 'firework-particle particle-palm';
                            const color = palette[i % palette.length];
                            particle.style.background = color;
                            particle.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
                            particle.style.setProperty('--angle', (i * 15) + 'deg');
                            
                            // Add comet tail
                            const tail = document.createElement('div');
                            tail.className = 'palm-tail';
                            tail.style.background = `linear-gradient(to bottom, ${color}, transparent)`;
                            particle.appendChild(tail);
                            
                            firework.appendChild(particle);
                        }
                    } else if (seq.type === 'finale') {
                        // Grand finale with multiple layers
                        const layers = [64, 48, 32];
                        layers.forEach((count, layerIndex) => {
                            for (let i = 0; i < count; i++) {
                                const particle = document.createElement('div');
                                particle.className = 'firework-particle particle-finale';
                                const color = palette[Math.floor(Math.random() * palette.length)];
                                particle.style.background = color;
                                particle.style.boxShadow = `0 0 15px ${color}`;
                                particle.style.setProperty('--angle', (i * (360 / count)) + 'deg');
                                particle.style.setProperty('--layer', layerIndex);
                                particle.style.setProperty('--delay', (layerIndex * 100) + 'ms');
                                firework.appendChild(particle);
                            }
                        });
                    }
                    
                    // Add elegant sparkles
                    for (let s = 0; s < 16; s++) {
                        const sparkle = document.createElement('div');
                        sparkle.className = 'elegant-sparkle';
                        sparkle.style.setProperty('--sparkle-angle', (s * 22.5) + 'deg');
                        sparkle.style.setProperty('--sparkle-delay', (Math.random() * 500) + 'ms');
                        firework.appendChild(sparkle);
                    }
                    
                    fireworksContainer.appendChild(firework);
                    
                    // Remove after animation
                    setTimeout(() => {
                        if (firework.parentNode) {
                            firework.parentNode.removeChild(firework);
                        }
                    }, 5000);
                }, seq.delay);
            });
            
            // Add subtle floating stars throughout - all at once
            setTimeout(() => {
                for (let i = 0; i < 30; i++) {
                    const star = document.createElement('div');
                    star.className = 'floating-star';
                    star.style.left = (Math.random() * 100) + '%';
                    star.style.top = (Math.random() * 100) + '%';
                    star.style.animationDelay = (Math.random() * 0.5) + 's';
                    star.style.animationDuration = (2 + Math.random() * 1) + 's';
                    fireworksContainer.appendChild(star);
                }
            }, 500); // Small delay to let fireworks start first

            // Remove container after all animations
            setTimeout(() => {
                if (fireworksContainer.parentNode) {
                    fireworksContainer.parentNode.removeChild(fireworksContainer);
                }
            }, 8000);

            // Gentle haptic feedback
            if (MobileUtils.isTouchDevice() && navigator.vibrate) {
                navigator.vibrate([50, 100, 50, 100, 100]);
            }
        },

        triggerSadRain() {
            // Create rain container
            const rainContainer = document.createElement('div');
            rainContainer.className = 'rain-container';
            document.body.appendChild(rainContainer);

            // Generate gentle rain drops and clouds
            const elements = ['☁️', '🌧️', '💧', '🌦️'];
            
            // Add floating clouds at the top
            for (let i = 0; i < 5; i++) {
                const cloud = document.createElement('div');
                cloud.className = 'floating-cloud';
                cloud.textContent = '☁️';
                cloud.style.left = (i * 20 + Math.random() * 10) + '%';
                cloud.style.animationDelay = (Math.random() * 2) + 's';
                rainContainer.appendChild(cloud);
            }
            
            // Generate rain drops
            for (let i = 0; i < 40; i++) {
                setTimeout(() => {
                    const drop = document.createElement('div');
                    drop.className = 'rain-drop';
                    
                    // Use water drops for most, occasional rain cloud
                    if (i % 8 === 0) {
                        drop.textContent = '🌧️';
                        drop.className += ' rain-cloud';
                    } else {
                        drop.textContent = '💧';
                    }
                    
                    // Random horizontal position
                    drop.style.left = Math.random() * 100 + '%';
                    
                    // Random animation duration and delay
                    drop.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
                    drop.style.animationDelay = Math.random() * 0.5 + 's';
                    drop.style.fontSize = (Math.random() * 10 + 15) + 'px';
                    
                    rainContainer.appendChild(drop);
                    
                    // Remove after animation
                    setTimeout(() => {
                        if (drop.parentNode) {
                            drop.parentNode.removeChild(drop);
                        }
                    }, 3500);
                }, i * 80);
            }
            
            // Add a gentle message
            setTimeout(() => {
                const message = document.createElement('div');
                message.className = 'rain-message';
                message.textContent = 'We\'ll miss you!';
                rainContainer.appendChild(message);
                
                setTimeout(() => {
                    if (message.parentNode) {
                        message.parentNode.removeChild(message);
                    }
                }, 3000);
            }, 1000);

            // Remove container after all animations
            setTimeout(() => {
                if (rainContainer.parentNode) {
                    rainContainer.parentNode.removeChild(rainContainer);
                }
            }, 5000);

            // Gentle vibration on mobile
            if (MobileUtils.isTouchDevice() && navigator.vibrate) {
                navigator.vibrate([30, 30, 30]);
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
            this.storyGalleryGrid = document.getElementById('storyGalleryGrid');
            
            // Debug: Check which galleries are found
            if (!this.galleryGrid) console.log('Main gallery not found - skipping main gallery init');
            if (!this.storyGalleryGrid) console.log('Story gallery not found - skipping story gallery init');
            
            this.autoScrollInterval = null;
            this.scrollSpeed = MobileUtils.isMobile() ? 1 : 2; // Slower on mobile for battery
            this.isPaused = false;
            this.currentImageIndex = 0;
            this.images = [];
            this.touchGesture = Object.create(TouchGesture);
            this.touchGesture.init();
            
            // Only initialize galleries that exist
            if (this.galleryGrid) {
                this.loadGalleryImages();
                this.setupAutoScroll();
            }
            
            if (this.storyGalleryGrid) {
                this.loadStoryGalleryImages();
            }
            
            this.setupMobileInteractions();
        },

        setupMobileInteractions() {
            if (!MobileUtils.isTouchDevice()) return;
            
            // Setup for main gallery (if it exists)
            if (this.galleryGrid) {
                this.setupTouchEventsForGallery(this.galleryGrid, 'main');
            }

            // Setup for story gallery (if it exists)
            if (this.storyGalleryGrid) {
                this.setupTouchEventsForGallery(this.storyGalleryGrid, 'story');
            }
        },

        setupTouchEventsForGallery(galleryElement, type) {
            // Touch event handlers for mobile swipe navigation
            galleryElement.addEventListener('touchstart', (e) => {
                this.touchGesture.start(e);
                if (type === 'main') {
                    this.isPaused = true; // Pause auto-scroll during touch
                } else {
                    this.isStoryPaused = true;
                }
            }, { passive: true });

            galleryElement.addEventListener('touchmove', (e) => {
                this.touchGesture.move(e);
                // Prevent default only for horizontal swipes
                if (!this.touchGesture.isScrolling) {
                    e.preventDefault();
                }
            }, { passive: false });

            galleryElement.addEventListener('touchend', (e) => {
                const swipeDirection = this.touchGesture.end(e);
                
                if (swipeDirection) {
                    this.handleSwipe(swipeDirection, type);
                    
                    // Provide haptic feedback on supported devices
                    if (window.navigator.vibrate) {
                        window.navigator.vibrate(50);
                    }
                }
                
                // Resume auto-scroll after a delay
                setTimeout(() => {
                    if (type === 'main') {
                        this.isPaused = false;
                    } else {
                        this.isStoryPaused = false;
                    }
                }, 2000);
            }, { passive: true });

            // Add visual feedback for touch interactions
            galleryElement.addEventListener('touchstart', () => {
                galleryElement.classList.add('touching');
            }, { passive: true });

            galleryElement.addEventListener('touchend', () => {
                galleryElement.classList.remove('touching');
            }, { passive: true });
        },

        handleSwipe(direction, type = 'main') {
            // Handle swipe navigation for mobile users
            if (direction === 'left') {
                this.scrollToNext(type);
            } else if (direction === 'right') {
                this.scrollToPrevious(type);
            }
        },

        scrollToNext(type = 'main') {
            const carousel = type === 'main' ? this.carousel : this.storyCarousel;
            if (!carousel) return;

            const imageSet = carousel.querySelector('.gallery__image-set');
            if (imageSet) {
                const itemWidth = 280 + 16; // Item width + gap
                const maxScroll = imageSet.offsetWidth;
                let currentTransform = this.getCurrentTransform(type);
                
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

        scrollToPrevious(type = 'main') {
            const carousel = type === 'main' ? this.carousel : this.storyCarousel;
            if (!carousel) return;

            const imageSet = carousel.querySelector('.gallery__image-set');
            if (imageSet) {
                const itemWidth = 280 + 16; // Item width + gap
                const maxScroll = imageSet.offsetWidth;
                let currentTransform = this.getCurrentTransform(type);
                
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

        getCurrentTransform(type = 'main') {
            const carousel = type === 'main' ? this.carousel : this.storyCarousel;
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

        loadStoryGalleryImages() {
            // Double check for the element
            this.storyGalleryGrid = document.getElementById('storyGalleryGrid');
            
            if (!this.storyGalleryGrid) {
                console.log('Story gallery grid not found');
                return;
            }

            // Same image list for story gallery
            const galleryImages = [
                'images/photo1.jpg',
                'images/photo2.jpg', 
                'images/photo3.jpg',
                'images/photo4.jpg',
                'images/photo5.jpg',
                'images/photo6.jpg',
                'images/photo7.jpg'
            ];

            // Remove placeholder text
            const placeholder = this.storyGalleryGrid.querySelector('.gallery__placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            // Create carousel container with auto-scroll
            const carousel = document.createElement('div');
            carousel.className = 'gallery__carousel';
            
            // Create two identical sets of images for seamless loop (like main gallery)
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
            
            this.storyGalleryGrid.appendChild(carousel);
            this.storyCarousel = carousel;
            
            // Setup auto-scroll for story gallery
            this.setupStoryAutoScroll();
        },

        setupStoryAutoScroll() {
            if (!this.storyCarousel) return;

            // Pause on hover for story gallery
            this.storyCarousel.addEventListener('mouseenter', () => {
                this.isStoryPaused = true;
            });

            this.storyCarousel.addEventListener('mouseleave', () => {
                this.isStoryPaused = false;
            });

            // Pause on focus (accessibility)
            this.storyCarousel.addEventListener('focusin', () => {
                this.isStoryPaused = true;
            });

            this.storyCarousel.addEventListener('focusout', () => {
                this.isStoryPaused = false;
            });

            // Start auto-scroll animation for story
            this.startStoryAutoScroll();
        },

        startStoryAutoScroll() {
            let scrollPosition = 0;
            this.isStoryPaused = false;
            
            const scroll = () => {
                if (!this.isStoryPaused && this.storyCarousel) {
                    scrollPosition += this.scrollSpeed;
                    
                    // Get the width of one image set
                    const imageSet = this.storyCarousel.querySelector('.gallery__image-set');
                    if (imageSet) {
                        const setWidth = imageSet.offsetWidth;
                        
                        // Reset position when we've scrolled one full set
                        if (scrollPosition >= setWidth) {
                            scrollPosition = 0;
                        }
                        
                        // Apply transform
                        this.storyCarousel.style.transform = `translateX(-${scrollPosition}px)`;
                    }
                }
                
                requestAnimationFrame(scroll);
            };
            
            // Start the animation
            requestAnimationFrame(scroll);
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
            this.isStoryPaused = true;
            
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
                this.isStoryPaused = false;
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

    // Scroll Animation Manager
    const ScrollAnimations = {
        init() {
            this.observeElements();
            this.setupInitialStates();
        },

        setupInitialStates() {
            // Add animation classes to sections (they start visible by default now)
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => {
                if (!section.closest('#hero')) {
                    section.classList.add('will-animate');
                }
            });
        },

        observeElements() {
            if (!window.IntersectionObserver) return;

            const options = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('fade-in');
                        
                        // Add staggered animation to child elements
                        this.animateChildElements(entry.target);
                        
                        // Unobserve once animated to improve performance
                        this.observer.unobserve(entry.target);
                    }
                });
            }, options);

            // Observe all sections
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => {
                this.observer.observe(section);
            });

            // Also observe other important elements
            const timelineItems = document.querySelectorAll('.timeline__item');
            timelineItems.forEach((item, index) => {
                item.style.transitionDelay = `${index * 0.2}s`;
                this.observer.observe(item);
            });
        },

        animateChildElements(section) {
            const children = section.querySelectorAll('.timeline__item, .venue__location, .faq__item, .story__text, .story__gallery');
            
            children.forEach((child, index) => {
                setTimeout(() => {
                    child.classList.add('fade-in');
                }, index * 150);
            });
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
                if (Gallery.isStoryPaused !== undefined) {
                    Gallery.isStoryPaused = true;
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
        ScrollAnimations.init();
        ServiceWorkerManager.init();
        Analytics.init();
        
        // Initialize FAQ flip cards
        const faqItems = document.querySelectorAll('.faq__item');
        faqItems.forEach(item => {
            const card = item.querySelector('.faq__card');
            
            if (card) {
                card.addEventListener('click', () => {
                    item.classList.toggle('flipped');
                });
                
                // Add keyboard support
                card.setAttribute('tabindex', '0');
                card.setAttribute('role', 'button');
                card.setAttribute('aria-pressed', 'false');
                
                card.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        item.classList.toggle('flipped');
                        card.setAttribute('aria-pressed', 
                            item.classList.contains('flipped') ? 'true' : 'false');
                    }
                });
            }
        });

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
