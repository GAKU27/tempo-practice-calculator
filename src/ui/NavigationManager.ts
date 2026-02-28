import { MetronomeUI } from './MetronomeUI';

export class NavigationManager {
    private menuBtn: HTMLElement | null = null;
    private closeMenuBtn: HTMLElement | null = null;
    private navMenu: HTMLElement | null = null;
    private navOverlay: HTMLElement | null = null;
    private navItems: NodeListOf<HTMLElement> | null = null;
    private viewSections: NodeListOf<HTMLElement> | null = null;

    private metronomeUI: MetronomeUI | null = null;

    constructor() { }

    public setMetronomeUI(metronomeUI: MetronomeUI) {
        this.metronomeUI = metronomeUI;
    }

    public init() {
        this.menuBtn = document.getElementById('menu-btn');
        this.closeMenuBtn = document.getElementById('close-menu-btn');
        this.navMenu = document.getElementById('nav-menu');
        this.navOverlay = document.getElementById('nav-overlay');
        this.navItems = document.querySelectorAll('.nav-item');
        this.viewSections = document.querySelectorAll('.view-section');

        if (!this.menuBtn || !this.navMenu || !this.navOverlay) {
            console.error('Navigation elements not found. Check HTML IDs.');
            return;
        }

        const toggleMenu = () => {
            if (this.navMenu) this.navMenu.classList.toggle('active');
            if (this.navOverlay) this.navOverlay.classList.toggle('active');
        };

        this.menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMenu();
        });

        if (this.closeMenuBtn) {
            this.closeMenuBtn.addEventListener('click', toggleMenu);
        }

        this.navOverlay.addEventListener('click', toggleMenu);

        if (this.navItems) {
            this.navItems.forEach(item => {
                item.addEventListener('click', () => {
                    const targetId = item.getAttribute('data-target');

                    // Switch View
                    if (this.viewSections) {
                        this.viewSections.forEach(section => {
                            if (section.id === targetId) {
                                section.classList.remove('hidden');
                                section.classList.add('active');
                            } else {
                                section.classList.add('hidden');
                                section.classList.remove('active');
                            }
                        });
                    }

                    // Update Menu State
                    if (this.navItems) {
                        this.navItems.forEach(nav => nav.classList.remove('active'));
                    }
                    item.classList.add('active');

                    // Close Menu
                    toggleMenu();

                    // Stop metronome if leaving metronome view
                    if (targetId !== 'metronome-view' && this.metronomeUI) {
                        this.metronomeUI.stop();
                    }
                });
            });
        }
    }
}
