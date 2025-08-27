// Modern Portfolio JavaScript - Siddhartha Mahajan
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-menu a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const headerHeight = 80; // Account for fixed header
                const targetPosition = targetElement.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Active navigation highlighting
    const sections = document.querySelectorAll('section[id]');
    const navItems = document.querySelectorAll('.nav-menu a[href^="#"]');

    function highlightActiveSection() {
        const scrollPosition = window.scrollY + 100; // Offset for header
        
        sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('href') === `#${sectionId}`) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }

    // Throttled scroll event listener
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(highlightActiveSection, 10);
    });

    // Intersection Observer for animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animateElements = document.querySelectorAll('.timeline-item, .experience-card, .project-card, .volunteering-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        .timeline-item,
        .experience-card,
        .project-card,
        .volunteering-card {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .timeline-item.animate-in,
        .experience-card.animate-in,
        .project-card.animate-in,
        .volunteering-card.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        /* Staggered animation for timeline items */
        .timeline-item:nth-child(2).animate-in { transition-delay: 0.1s; }
        .timeline-item:nth-child(3).animate-in { transition-delay: 0.2s; }
        .timeline-item:nth-child(4).animate-in { transition-delay: 0.3s; }
        .timeline-item:nth-child(5).animate-in { transition-delay: 0.4s; }
        
        /* Staggered animation for project cards */
        .project-card:nth-child(2).animate-in { transition-delay: 0.1s; }
        .project-card:nth-child(3).animate-in { transition-delay: 0.2s; }
        .project-card:nth-child(4).animate-in { transition-delay: 0.3s; }
        
        /* Active nav link styling */
        .nav-menu a.active {
            color: var(--accent-primary);
        }
        
        .nav-menu a.active::after {
            width: 100%;
        }
    `;
    document.head.appendChild(style);

    // Email copy functionality (if needed)
    const emailElements = document.querySelectorAll('[href="mailto:siddharthamahajan03@gmail.com"]');
    emailElements.forEach(element => {
        element.addEventListener('click', function(e) {
            // Optional: Add analytics or tracking here
            console.log('Email link clicked');
        });
    });

    // Typewriter effect for hero title (optional enhancement)
    function typewriterEffect() {
        const titleElement = document.querySelector('.hero-title');
        if (!titleElement) return;

        const text = titleElement.textContent;
        const highlightText = titleElement.querySelector('.highlight');
        
        if (highlightText) {
            // Skip typewriter if highlight span exists
            return;
        }

        titleElement.style.borderRight = '2px solid var(--accent-primary)';
        titleElement.style.animation = 'blink 1s infinite';
        
        // Add blink animation
        const blinkStyle = document.createElement('style');
        blinkStyle.textContent = `
            @keyframes blink {
                0%, 50% { border-color: var(--accent-primary); }
                51%, 100% { border-color: transparent; }
            }
        `;
        document.head.appendChild(blinkStyle);
    }

    // Initialize typewriter effect after a short delay
    setTimeout(typewriterEffect, 500);

    // Mobile menu toggle (basic implementation)
    function initMobileMenu() {
        const navMenu = document.querySelector('.nav-menu');
        const navContainer = document.querySelector('.nav-container');
        
        // Create mobile menu button
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '☰';
        mobileMenuBtn.style.cssText = `
            display: none;
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 1.5rem;
            cursor: pointer;
        `;
        
        navContainer.appendChild(mobileMenuBtn);
        
        mobileMenuBtn.addEventListener('click', function() {
            navMenu.classList.toggle('mobile-open');
        });
        
        // Add mobile styles
        const mobileStyle = document.createElement('style');
        mobileStyle.textContent = `
            @media (max-width: 768px) {
                .mobile-menu-btn {
                    display: block !important;
                }
                
                .nav-menu {
                    display: flex !important;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: rgba(10, 10, 10, 0.95);
                    backdrop-filter: blur(20px);
                    flex-direction: column;
                    padding: 1rem;
                    border-top: 1px solid var(--border-subtle);
                    transform: translateY(-100%);
                    opacity: 0;
                    pointer-events: none;
                    transition: all 0.3s ease;
                }
                
                .nav-menu.mobile-open {
                    transform: translateY(0);
                    opacity: 1;
                    pointer-events: all;
                }
                
                .nav-menu a {
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--border-subtle);
                }
                
                .nav-menu a:last-child {
                    border-bottom: none;
                }
            }
        `;
        document.head.appendChild(mobileStyle);
    }
    
    initMobileMenu();
});

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Performance optimization: Lazy load images
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });

        const lazyImages = document.querySelectorAll('img[data-src]');
        lazyImages.forEach(img => imageObserver.observe(img));
    }
}

// Initialize lazy loading when DOM is ready
document.addEventListener('DOMContentLoaded', initLazyLoading);