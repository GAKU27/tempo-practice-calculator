import { MetronomeUI } from './MetronomeUI';

export class NavigationManager {
    private navMenu: HTMLElement | null = null;
    private tabItems: NodeListOf<HTMLElement> | null = null;
    private viewSections: NodeListOf<HTMLElement> | null = null;

    private metronomeUI: MetronomeUI | null = null;

    constructor() { }

    public setMetronomeUI(metronomeUI: MetronomeUI) {
        this.metronomeUI = metronomeUI;
    }

    public init() {
        this.navMenu = document.getElementById('nav-menu');
        this.tabItems = document.querySelectorAll('.tab-item');
        this.viewSections = document.querySelectorAll('.view-section');

        if (!this.navMenu) {
            console.error('Navigation elements not found. Check HTML IDs.');
            return;
        }

        if (this.tabItems) {
            // Setup initial scroll state based on active tab
            this.tabItems.forEach(item => {
                if (item.classList.contains('active')) {
                    const targetId = item.getAttribute('data-target');
                    if (targetId === 'metronome-view' || targetId === 'timer-view' || targetId === 'settings-view') {
                        document.body.style.overflow = 'hidden';
                        document.body.classList.add('fullscreen-mode');
                    }
                }
            });

            this.tabItems.forEach(item => {
                item.addEventListener('click', () => {
                    const targetId = item.getAttribute('data-target');

                    // Manage scrolling state
                    if (targetId === 'metronome-view' || targetId === 'timer-view' || targetId === 'settings-view') {
                        document.body.style.overflow = 'hidden';
                        document.body.classList.add('fullscreen-mode');
                    } else {
                        document.body.style.overflow = '';
                        document.body.classList.remove('fullscreen-mode');
                    }

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

                    // Update Tab State
                    if (this.tabItems) {
                        this.tabItems.forEach(nav => nav.classList.remove('active'));
                    }
                    item.classList.add('active');

                    // Stop metronome if leaving metronome view
                    if (targetId !== 'metronome-view' && this.metronomeUI) {
                        this.metronomeUI.stop();
                    }
                });
            });
        }
    }
}
