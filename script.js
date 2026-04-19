// ===========================
// Dark Mode Toggle
// ===========================

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply saved theme or system preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Initialize theme on page load
initTheme();

// Add event listener to theme toggle button
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

// ===========================
// Original JavaScript
// ===========================

// Smooth scroll behavior for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add animation on scroll for elements
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    observer.observe(section);
});

// Active navigation link highlighting
function setActiveNavLink() {
    let path = window.location.pathname;
    
    // If working locally (file://), path might end with .html
    if (path.endsWith('.html')) {
        path = path.substring(0, path.length - 5);
    }
    // Remove trailing slash for consistency (unless it's just '/')
    if (path.endsWith('/') && path.length > 1) {
        path = path.slice(0, -1);
    }
    
    // Get the final segment (e.g. 'publications' or '')
    let page = path.split('/').pop();
    if (!page || page.toLowerCase() === 'index') {
        page = '/';
    } else {
        page = '/' + page;
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
    setActiveNavLink();
    
    // Add subtle parallax effect to hero section if it exists
    const hero = document.querySelector('.hero');
    // Removed parallax effect to prevent overlapping
});

// Print CV functionality
const downloadBtn = document.querySelector('.download-btn');
if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.print();
    });
}

// Add loading animation to publication/project links
document.querySelectorAll('.pub-link, .project-link').forEach(link => {
    link.addEventListener('click', function(e) {
        if (this.getAttribute('href') === '#') {
            e.preventDefault();
            // You can add actual functionality here later
            console.log('Link clicked:', this.textContent);
        }
    });
});

// Responsive navigation toggle for mobile
function createMobileNav() {
    const navMenu = document.querySelector('.nav-menu');
    const navContainer = document.querySelector('.nav-container');
    
    if (window.innerWidth <= 768 && !document.querySelector('.nav-toggle')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'nav-toggle';
        toggleBtn.innerHTML = '☰';
        toggleBtn.setAttribute('aria-label', 'Toggle navigation');
        
        toggleBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        
        navContainer.insertBefore(toggleBtn, navMenu);
    }
}

// Call on load and resize
window.addEventListener('load', createMobileNav);
window.addEventListener('resize', createMobileNav);
