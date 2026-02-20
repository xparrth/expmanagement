/* ============================================
   MOLTEN CORE — INTERACTIVE BACKGROUND
   Particle System & Mouse Interaction
   ============================================ */

(function() {
    'use strict';

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBackground);
    } else {
        initBackground();
    }

    function initBackground() {
        createBackgroundStructure();
        initParticleCanvas();
        initMouseInteraction();
        initGlowOrbs();
    }

    // Create background HTML structure
    function createBackgroundStructure() {
        // Check if background already exists
        if (document.querySelector('.molten-background')) return;

        const bg = document.createElement('div');
        bg.className = 'molten-background';
        bg.innerHTML = `
            <div class="lava-blob blob-1"></div>
            <div class="lava-blob blob-2"></div>
            <div class="lava-blob blob-3"></div>
            <div class="lava-blob blob-4"></div>
            <div class="lava-blob blob-5"></div>
            <canvas id="particle-canvas"></canvas>
            <div class="gradient-mesh"></div>
            <div class="noise-overlay"></div>
        `;
        document.body.insertBefore(bg, document.body.firstChild);
    }

    // Particle Canvas System
    function initParticleCanvas() {
        const canvas = document.getElementById('particle-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let particles = [];
        let animationId;

        // Resize canvas
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Particle class
        class Particle {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.y = canvas.height + Math.random() * 100;
                this.size = Math.random() * 2 + 0.5;
                this.speedY = Math.random() * 0.5 + 0.2;
                this.speedX = (Math.random() - 0.5) * 0.3;
                this.opacity = Math.random() * 0.5 + 0.3;
                this.color = this.getRandomColor();
            }

            getRandomColor() {
                const colors = [
                    'rgba(255, 107, 26, ',   // orange
                    'rgba(255, 140, 66, ',   // orange-bright
                    'rgba(255, 171, 0, ',    // amber
                    'rgba(255, 69, 0, '      // lava
                ];
                return colors[Math.floor(Math.random() * colors.length)];
            }

            update() {
                this.y -= this.speedY;
                this.x += this.speedX;
                
                // Reset if out of bounds
                if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
                    this.reset();
                }
            }

            draw() {
                ctx.fillStyle = this.color + this.opacity + ')';
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();

                // Glow effect
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color + '0.8)';
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }

        // Create particles
        const particleCount = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 80);
        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        // Animation loop
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.update();
                particle.draw();
            });

            animationId = requestAnimationFrame(animate);
        }

        animate();

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            cancelAnimationFrame(animationId);
        });
    }

    // Mouse Interaction with Blobs
    function initMouseInteraction() {
        const blobs = document.querySelectorAll('.lava-blob');
        if (!blobs.length) return;

        let mouseX = 0;
        let mouseY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            blobs.forEach((blob, index) => {
                const rect = blob.getBoundingClientRect();
                const blobCenterX = rect.left + rect.width / 2;
                const blobCenterY = rect.top + rect.height / 2;

                const deltaX = mouseX - blobCenterX;
                const deltaY = mouseY - blobCenterY;
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

                // Repel blobs from cursor
                if (distance < 300) {
                    const force = (300 - distance) / 300;
                    const moveX = -deltaX * force * 0.3;
                    const moveY = -deltaY * force * 0.3;

                    blob.style.transform = `translate(${moveX}px, ${moveY}px)`;
                    blob.style.opacity = 0.4 + force * 0.2;
                } else {
                    blob.style.transform = 'translate(0, 0)';
                    blob.style.opacity = '';
                }
            });
        });

        // Reset on mouse leave
        document.addEventListener('mouseleave', () => {
            blobs.forEach(blob => {
                blob.style.transform = '';
                blob.style.opacity = '';
            });
        });
    }

    // Glowing Orbs
    function initGlowOrbs() {
        const background = document.querySelector('.molten-background');
        if (!background) return;

        function createOrb() {
            const orb = document.createElement('div');
            orb.className = 'glow-orb';
            orb.style.left = Math.random() * 100 + '%';
            orb.style.animationDelay = Math.random() * 8 + 's';
            orb.style.animationDuration = (Math.random() * 4 + 6) + 's';
            background.appendChild(orb);

            // Remove after animation
            setTimeout(() => {
                orb.remove();
            }, (parseFloat(orb.style.animationDuration) + parseFloat(orb.style.animationDelay)) * 1000);
        }

        // Create orbs periodically
        setInterval(createOrb, 2000);
        
        // Create initial orbs
        for (let i = 0; i < 5; i++) {
            setTimeout(createOrb, i * 400);
        }
    }

    // Performance optimization: Reduce animations on low-end devices
    function detectLowPerformance() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;
        
        if (isMobile || isLowMemory) {
            document.documentElement.style.setProperty('--reduce-motion', '1');
            const blobs = document.querySelectorAll('.lava-blob');
            blobs.forEach((blob, index) => {
                if (index > 2) blob.style.display = 'none';
            });
        }
    }

    detectLowPerformance();

})();
