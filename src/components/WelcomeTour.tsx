"use client";

import * as React from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_KEY = "flowstate-welcome-tour-seen";
const TOUR_STYLE_ID = "flowstate-driver-tour-theme";

export function WelcomeTour() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (!document.getElementById(TOUR_STYLE_ID)) {
      const style = document.createElement("style");
      style.id = TOUR_STYLE_ID;
      style.textContent = `
        .driver-popover {
          background: #ffffff !important;
          border: 1px solid rgba(229, 231, 235, 0.95) !important;
          border-radius: 16px !important;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.08) !important;
          padding: 16px !important;
          max-width: 340px;
        }

        .driver-popover-title {
          color: #1a1a1a !important;
          font-weight: 650 !important;
          letter-spacing: -0.012em;
          font-size: 16px !important;
          line-height: 1.3 !important;
        }

        .driver-popover-description {
          color: #5f6368 !important;
          font-size: 14px !important;
          font-weight: 450 !important;
          line-height: 1.58 !important;
          margin-top: 6px !important;
        }

        .driver-popover-footer {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 10px !important;
          margin-top: 10px !important;
        }

        .driver-popover-navigation-btns {
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          margin-left: auto !important;
        }

        .driver-popover-progress-text {
          color: rgba(26, 26, 26, 0.45) !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          margin-right: auto !important;
          line-height: 1 !important;
        }

        .driver-popover-footer button {
          border-radius: 9999px !important;
          transition: all 140ms ease !important;
          border: 1px solid transparent !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          padding: 8px 14px !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }

        .driver-popover-prev-btn {
          background: transparent !important;
          color: rgba(26, 26, 26, 0.56) !important;
          border-color: transparent !important;
        }

        .driver-popover-prev-btn:hover {
          background: rgba(241, 245, 249, 0.8) !important;
          color: rgba(26, 26, 26, 0.9) !important;
        }

        .driver-popover-next-btn,
        .driver-popover-done-btn {
          background: rgb(244, 63, 94) !important;
          color: white !important;
          border-color: rgb(244, 63, 94) !important;
        }

        .driver-popover-next-btn:hover,
        .driver-popover-done-btn:hover {
          background: rgb(225, 29, 72) !important;
          border-color: rgb(225, 29, 72) !important;
        }

        .driver-active-element {
          box-shadow:
            0 0 0 1.5px rgba(244, 63, 94, 0.55),
            0 0 0 6px rgba(244, 63, 94, 0.12),
            0 8px 24px rgba(244, 63, 94, 0.16) !important;
          border-radius: 12px !important;
        }

        .driver-overlay {
          pointer-events: none !important;
        }

      `;
      document.head.appendChild(style);
    }
    // TEMPORARY (testing): always show tour on refresh.
    // if (window.localStorage.getItem(TOUR_KEY) === "1") return;

    let started = false;
    const requiredSelectors = [
      "#new-board-btn",
      ".board-list",
      ".tour-add-task-btn",
      "[data-tour='task-drag']",
      "[data-tour='column-drag']",
      "#user-button",
    ];
    const coreSelectors = ["#new-board-btn", ".board-list", "#user-button"];

    const start = (allowCoreFallback = false) => {
      if (started) return;
      const hasAllRequired = requiredSelectors.every((selector) =>
        Boolean(document.querySelector(selector)),
      );
      const hasCoreRequired = coreSelectors.every((selector) => Boolean(document.querySelector(selector)));
      if (!hasAllRequired && !(allowCoreFallback && hasCoreRequired)) return;

      const stepDefs = [
        {
          element: "#new-board-btn",
          popover: {
            title: "New Board",
            description: "Start your journey by creating your first project board here.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: ".board-list",
          popover: {
            title: "Your Projects",
            description: "All your created boards will be listed here for easy access.",
            side: "bottom" as const,
            align: "start" as const,
          },
        },
        {
          element: ".tour-add-task-btn",
          popover: {
            title: "New Task",
            description: "Quickly add tasks to your columns to keep track of your work.",
            side: "top" as const,
            align: "start" as const,
          },
        },
        {
          element: "[data-tour='task-drag']",
          popover: {
            title: "Move Tasks",
            description: "Drag and drop tasks between columns to update their status.",
            side: "left" as const,
            align: "center" as const,
          },
        },
        {
          element: "[data-tour='column-drag']",
          popover: {
            title: "Organize Workflow",
            description: "Rearrange columns by dragging them to customize your workflow.",
            side: "left" as const,
            align: "center" as const,
          },
        },
        {
          element: "[data-tour='task-open']",
          popover: {
            title: "Edit Task Details",
            description:
              "Click a task card to open and update its title, description, labels, and due date.",
            side: "left" as const,
            align: "center" as const,
          },
        },
        {
          element: "#user-button",
          popover: {
            title: "Profile & Settings",
            description: "Manage your account settings or log out from here.",
            side: "left" as const,
            align: "center" as const,
          },
        },
      ];
      const steps = stepDefs.filter((step) => document.querySelector(step.element));
      if (steps.length === 0) return;
      started = true;

      const tour = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayOpacity: 0.35,
        nextBtnText: "Next",
        prevBtnText: "Previous",
        doneBtnText: "Done",
        onDestroyed: () => {
          window.localStorage.setItem(TOUR_KEY, "1");
        },
        steps,
      });

      tour.drive();
    };

    // Aggressive start: try immediately, then observe DOM for very fast mount changes.
    start();

    const observer = new MutationObserver(() => {
      if (started) {
        observer.disconnect();
        return;
      }
      start();
      if (started) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Tiny fallback tick for hydration edge-cases (<= 50ms as requested).
    const t = window.setTimeout(() => {
      if (!started) start();
    }, 50);

    // Hard fallback: never fail silently. Start with core steps if full 6 are unavailable.
    const fallback = window.setTimeout(() => {
      if (!started) start(true);
    }, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(t);
      window.clearTimeout(fallback);
    };
  }, []);

  return null;
}
