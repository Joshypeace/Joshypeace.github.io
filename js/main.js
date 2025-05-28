// Navbar Scroll Effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar-custom');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// explore my work

function goToExplore(){
    const myButton = document.getElementById('my_button');
    myButton.addEventListener('click',()=>{
        window.location.href = "./html/projects.html";
    });
    
}

// Mobile Menu Toggle
function toggleMenu() {
    const hamburger = document.querySelector('.hamburger');
    const sideMenu = document.getElementById('sideMenu');
    
    hamburger.classList.toggle('active');
    sideMenu.classList.toggle('open');
    
   
    document.body.classList.toggle('no-scroll');
}

// Close menu when clicking on a link
document.querySelectorAll('.side-menu a').forEach(link => {
    link.addEventListener('click', toggleMenu);
});

// Intersection Observer for Animations
const animateOnScroll = function() {
    const elements = document.querySelectorAll('.skill, .project-card');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    elements.forEach(element => {
        observer.observe(element);
    });
};

// Smooth Scrolling for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 70,
                behavior: 'smooth'
            });
        }
    });
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    const skillsSection = document.querySelector('.skills-section');
    const skills = document.querySelectorAll('.skill');
    const progressBars = document.querySelectorAll('.progress-bar');
    const projectCards = document.querySelectorAll('.project-card');

    function isInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top <= (window.innerHeight || document.documentElement.clientHeight)
        );
    }

    function animateSections() {
        // Animate Skills
        if (skillsSection && isInViewport(skillsSection)) {
            skillsSection.classList.add('show');
            skills.forEach(skill => skill.classList.add('show'));
            progressBars.forEach(bar => {
                const progress = bar.style.getPropertyValue('--progress');
                bar.style.width = progress;
                bar.setAttribute('data-progress', progress);
            });
        }

        // Animate Projects
        projectCards.forEach(card => {
            if (isInViewport(card)) {
                card.classList.add('show');
            }
        });
    }

    window.addEventListener('scroll', animateSections);
    animateSections(); // Run once on load

    // Project card hover effect (safe)
    projectCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const overlay = this.querySelector('.project-overlay');
            if (overlay) overlay.style.opacity = '1';
        });

        card.addEventListener('mouseleave', function() {
            const overlay = this.querySelector('.project-overlay');
            if (overlay) overlay.style.opacity = '0';
        });
    });
});

// Contact Form Submission
const contactForm = document.getElementById('contactForm');
const formStatus = document.getElementById('formStatus');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;
        
        fetch(this.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                formStatus.textContent = 'Message sent successfully! I will get back to you soon.';
                formStatus.classList.add('success');
                contactForm.reset();
            } else {
                throw new Error('Network response was not ok');
            }
        })
        .catch(error => {
            formStatus.textContent = 'Oops! There was a problem sending your message. Please try again later.';
            formStatus.classList.add('error');
            console.error('Error:', error);
        })
        .finally(() => {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
            formStatus.style.display = 'block';
            
            // Hide status message after 5 seconds
            setTimeout(() => {
                formStatus.style.display = 'none';
                formStatus.classList.remove('success', 'error');
            }, 5000);
        });
    });
}

// Back to Top Button
const backToTopBtn = document.getElementById('backToTop');
if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTopBtn.style.opacity = '1';
            backToTopBtn.style.visibility = 'visible';
        } else {
            backToTopBtn.style.opacity = '0';
            backToTopBtn.style.visibility = 'hidden';
        }
    });
}

// Update copyright year
document.getElementById('year').textContent = new Date().getFullYear();

// Add intersection observer for contact section
const contactSection = document.querySelector('.contact-section');
if (contactSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    observer.observe(contactSection);
}


// Explore my work

// Filter Projects
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectItems = document.querySelectorAll('.project-item');
    
    // Filter projects based on category
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            const filterValue = button.getAttribute('data-filter');
            
            // Filter projects
            projectItems.forEach(item => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
    
    // Animate projects on scroll
    const animateProjects = function() {
        const projects = document.querySelectorAll('.project-item');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('show');
                    }, index * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        projects.forEach(project => {
            observer.observe(project);
        });
    };
    
    // Initialize animations
    animateProjects();
    
    // Back to Top Button
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.style.opacity = '1';
                backToTopBtn.style.visibility = 'visible';
            } else {
                backToTopBtn.style.opacity = '0';
                backToTopBtn.style.visibility = 'hidden';
            }
        });
    }
    
    // Update copyright year
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // Mobile menu toggle (reuse from main.js)
    function toggleMenu() {
        const hamburger = document.querySelector('.hamburger');
        const sideMenu = document.getElementById('sideMenu');
        
        hamburger.classList.toggle('active');
        sideMenu.classList.toggle('open');
        document.body.classList.toggle('no-scroll');
    }
    
    // Close menu when clicking on a link
    document.querySelectorAll('.side-menu a').forEach(link => {
        link.addEventListener('click', toggleMenu);
    });
});


// RESPONSIVENESS

function checkMobile() {
    const isMobile = window.innerWidth <= 767;
    const isLandscape = window.innerWidth > window.innerHeight;
    
    
    if (isMobile) {
        document.body.classList.add('mobile-view');
        if (isLandscape) {
            document.body.classList.add('landscape-mode');
        } else {
            document.body.classList.remove('landscape-mode');
        }
    } else {
        document.body.classList.remove('mobile-view', 'landscape-mode');
    }
    
    // Adjust hero section height in landscape
    if (isMobile && isLandscape) {
        const hero = document.querySelector('.hero');
        if (hero) {
            hero.style.minHeight = 'auto';
            hero.style.padding = '40px 20px';
        }
    }
}


window.addEventListener('load', checkMobile);
window.addEventListener('resize', checkMobile);


function adjustScrollIndicator() {
    const scrollIndicator = document.querySelector('.scroll-indicator');
    if (scrollIndicator && window.innerWidth <= 767) {
        scrollIndicator.style.bottom = '20px';
    }
}

window.addEventListener('load', adjustScrollIndicator);
window.addEventListener('resize', adjustScrollIndicator);

