// Initialize Framer Motion animations
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle functionality
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    toggleSidebar.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        mainContent.classList.toggle('pushed');
    });

    // Initialize mobile sidebar state
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
        mainContent.classList.remove('pushed');
    } else {
        sidebar.classList.add('active');
        mainContent.classList.add('pushed');
    }

    // Tab functionality
    initializeTabs();

    // Back to top button
    const backToTopButton = document.getElementById('back-to-top');
    const stickyNav = document.querySelector('.sticky-nav');

    window.addEventListener('scroll', function() {
        // Back to top button visibility
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }

        // Header visibility on scroll
        if (window.pageYOffset > 100) {
            stickyNav.classList.add('scrolled');
        } else {
            stickyNav.classList.remove('scrolled');
        }
    });

    backToTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Add animation to cards
    animateCards();

    // Add active class to first nav link by default
    const navLinks = document.getElementsByClassName('nav-link');
    if (navLinks.length > 0) {
        navLinks[0].classList.add('active');
    }
});

// Tab functionality
function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    const tabs = document.getElementsByClassName('tab');

    // Hide all tab contents
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove('active');
    }

    // Remove active class from all tabs
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove('active');
    }

    // Show the selected tab content
    document.getElementById(tabName).classList.add('active');

    // Add active class to the clicked tab
    for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].textContent.toLowerCase().includes(tabName)) {
            tabs[i].classList.add('active');
        }
    }
}

function initializeTabs() {
    const tabs = document.getElementsByClassName('tab');
    for (let i = 0; i < tabs.length; i++) {
        tabs[i].addEventListener('click', function() {
            const tabName = this.textContent.toLowerCase().trim();
            openTab(tabName === 'overview' ? 'overview' :
                   tabName === 'problems' ? 'problems' : 'resources');
        });
    }
}

// Scroll to section functionality
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    const navLinks = document.getElementsByClassName('nav-link');

    // Remove active class from all nav links
    for (let i = 0; i < navLinks.length; i++) {
        navLinks[i].classList.remove('active');
    }

    // Add active class to clicked nav link
    for (let i = 0; i < navLinks.length; i++) {
        if (navLinks[i].getAttribute('onclick').includes(sectionId)) {
            navLinks[i].classList.add('active');
        }
    }

    // Scroll to section
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Animate cards with Framer Motion
function animateCards() {
    const cards = document.querySelectorAll('.card, .question');

    // Create a simple observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Use Framer Motion to animate the card
                const card = entry.target;

                // Apply animation using Framer Motion
                if (window.framerMotion) {
                    framerMotion.animate(card,
                        { opacity: [0, 1], y: [50, 0] },
                        { duration: 0.5, ease: "easeOut" }
                    );
                }

                // Unobserve after animation
                observer.unobserve(card);
            }
        });
    }, { threshold: 0.1 });

    // Observe each card
    cards.forEach(card => {
        observer.observe(card);
    });
}
