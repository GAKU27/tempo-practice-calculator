export class VisualEffects {
    public static init() {
        this.initRipple();
        this.initParallax();
    }

    private static initRipple() {
        document.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            // Get closest button that supports ripple
            const button = target.closest('.icon-btn, .control-btn, .calculate-btn, .play-btn, .timer-btn, .settings-toggle-btn, .timer-tab, .lap-record-btn, .close-settings-btn, .tap-btn') as HTMLElement;

            if (!button) return;
            if ((button as HTMLButtonElement).disabled) return;

            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');

            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);

            ripple.style.width = ripple.style.height = `${size}px`;

            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            button.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    }

    private static initParallax() {
        const orbs = document.querySelectorAll('.orb') as NodeListOf<HTMLElement>;
        if (orbs.length === 0) return;

        // Use requestAnimationFrame for smooth performance
        let isTicking = false;
        let mouseX = 0;
        let mouseY = 0;

        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;

            if (!isTicking) {
                requestAnimationFrame(() => {
                    const x = mouseX / window.innerWidth - 0.5;
                    const y = mouseY / window.innerHeight - 0.5;

                    orbs.forEach((orb, index) => {
                        // Different depths for each orb
                        const depthX = (index + 1) * 30;
                        const depthY = (index + 1) * 20;
                        const moveX = x * depthX * -1;
                        const moveY = y * depthY * -1;

                        // Apply margin without overwriting the original CSS animation (transform)
                        orb.style.marginLeft = `${moveX}px`;
                        orb.style.marginTop = `${moveY}px`;
                    });

                    isTicking = false;
                });
                isTicking = true;
            }
        });
    }
}
