(() => {
    "use strict";

    const SidebarModule = (() => {
        const navbarToggle = document.querySelector("#navbarToggle");
        const sidebar = document.querySelector("#sidebar");
        const overlay = document.querySelector("#overlay");
        const navButtons = document.querySelectorAll(".nav-button");
        const draggableElements = document.querySelectorAll(".draggable");

        if (!sidebar || !overlay || !navbarToggle) {
            console.error("Sidebar elements not found in the DOM.");
            return;
        }

        function highlightNavButton() {
            const currentLocation = window.location.pathname.split("/").pop() || "index.html";

            navButtons.forEach((button) => {
                const buttonPath = button.getAttribute("onclick")?.match(/'([^']+)'/);
                if (buttonPath) {
                    const isActive = currentLocation === buttonPath[1];
                    requestAnimationFrame(() => {
                        button.classList.toggle("active", isActive);
                        button.disabled = isActive;
                    });
                }
            });
        }

        function toggleMenu(open) {
            if (!sidebar || !overlay) return;

            const isOpen = sidebar.classList.contains("open-sidebar");

            if (open === undefined) {
                open = !isOpen;
            }

            if (open) {
                sidebar.style.display = "block";
                requestAnimationFrame(() => {
                    sidebar.classList.add("open-sidebar");
                    overlay.classList.add("show-overlay");
                    document.body.style.overflow = "hidden";
                });
                addHistoryState();
            } else {
                requestAnimationFrame(() => {
                    sidebar.classList.remove("open-sidebar");
                    overlay.classList.remove("show-overlay");
                    document.body.style.overflow = "";
                    setTimeout(() => {
                        sidebar.style.display = "none";
                    }, 300);
                });
                removeHistoryState();
            }
        }

        function addHistoryState() {
            if (!window.history.state || window.history.state.menuOpen !== true) {
                window.history.pushState({ menuOpen: true }, "");
            }
        }

        function removeHistoryState() {
            if (window.history.state && window.history.state.menuOpen === true) {
                window.history.back();
            }
        }

        function clearAllStates() {
            toggleMenu(false);
        }

        function isInsideDraggableElement(event) {
            return Array.from(draggableElements).some((element) => element.contains(event.target));
        }

        function enableSwipeGesture() {
            let touchstartX = 0;
            let touchCurrentX = 0;

            document.addEventListener(
                "touchstart",
                (event) => {
                    if (!isInsideDraggableElement(event)) {
                        touchstartX = event.touches[0].clientX;
                        touchCurrentX = touchstartX;
                    }
                },
                { passive: true }
            );

            document.addEventListener(
                "touchmove",
                (event) => {
                    touchCurrentX = event.touches[0].clientX;

                    if (sidebar.classList.contains("open-sidebar") && touchCurrentX < touchstartX - 90) {
                        toggleMenu(false);
                    }
                },
                { passive: true }
            );
        }

        function initialize() {
            highlightNavButton();
            navbarToggle.addEventListener("click", () => toggleMenu());
            overlay.addEventListener("click", clearAllStates);
            window.addEventListener("beforeunload", clearAllStates);
            enableSwipeGesture();
        }

        window.addEventListener("popstate", (event) => {
            if (!event.state || !event.state.menuOpen) {
                clearAllStates();
            }
        });

        return { initialize };
    })();

    document.addEventListener("DOMContentLoaded", SidebarModule.initialize);

    window.addEventListener("error", (event) => {
        console.error("เกิดข้อผิดพลาด:", event.message);
    });
})();