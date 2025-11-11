# UI & Component Specification

## 1. High-Level Philosophy

This document defines the visual design, behavior, and component architecture for the Adaptive Brightness Control application. Its purpose is to ensure a consistent, intuitive, and high-quality user experience across all current and future features.

-   **Clarity over Clutter:** The UI prioritizes displaying the most relevant information—current brightness levels and operational status—at a glance. Secondary controls are accessible but not intrusive.
-   **Data-Driven:** The interface is a direct reflection of the backend's state. All data is pushed in real-time, providing immediate feedback to the user.
-   **Responsive & Accessible:** The layout adapts gracefully from a multi-column desktop view to a single-column mobile view. Interactive elements are clearly defined with proper focus states.
-   **Minimalist Aesthetics:** The design uses a dark-themed, modern aesthetic with a limited color palette to create a professional and focused tool.

---

## 2. Design System

### 2.1. Color Palette

The color scheme is based on a dark theme to be easy on the eyes, with a vibrant primary color for interactive elements and clear status indicators.

| Color           | Hex       | Tailwind Class    | Usage                                                                 |
| --------------- | --------- | ----------------- | --------------------------------------------------------------------- |
| Background      | `#121212` | `bg-gray-900`     | Main application background.                                          |
| Card Background | `#1E1E1E` | `bg-gray-800`     | Background for cards and modals.                                      |
| Borders/Inputs  | `#2C2C2C` | `bg-gray-700`     | Borders, input backgrounds, and inactive elements.                    |
| Muted Text      | `#9CA3AF` | `text-gray-400`   | Descriptive text, subtitles, and secondary labels.                    |
| Body Text       | `#E5E7EB` | `text-gray-200`   | Primary text color for labels and content.                            |
| Primary         | `#6366F1` | `bg-primary`      | Active state indicators, toggles, sliders, and primary buttons.       |
| Primary Focus   | `#4F46E5` | `bg-primary-focus`| Hover/focus state for primary interactive elements.                   |
| Status: OK      | Green     | `bg-green-500`    | "Connected" status indicator.                                         |
| Status: Warn    | Yellow    | `bg-yellow-500`   | "Connecting" status indicator and Demo Mode banner.                   |
| Status: Error   | Red       | `bg-red-500`      | "Disconnected" status indicator and error messages.                   |

### 2.2. Typography

A clean, sans-serif font is used for readability, with a monospaced font for technical identifiers and numeric values to ensure clarity and alignment.

| Element                     | Font Family | Size          | Weight       | Color           |
| --------------------------- | ----------- | ------------- | ------------ | --------------- |
| H1 (Header Title)           | Sans-serif  | `text-2xl`    | `font-bold`  | `text-white`    |
| H2 (Card/Modal Title)       | Sans-serif  | `text-lg/xl`  | `font-bold`  | `text-white`    |
| Label / Medium Text         | Sans-serif  | `text-sm`     | `font-medium`| `text-gray-200` |
| Body / Description          | Sans-serif  | `text-sm`     | `font-normal`| `text-gray-400` |
| Device ID / Numeric Value   | Monospace   | `text-xs/sm`  | `font-mono`  | `text-gray-500` |

### 2.3. Layout & Spacing

A consistent spacing scale and responsive grid provide a structured and predictable layout.

-   **Main Container:** `container mx-auto` with `p-4 md:p-6`.
-   **Card Grid:** A responsive grid using `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` with `gap-6`.
-   **Standard Padding:** `p-6` is the standard padding for card and modal content areas.
-   **Standard Gaps:** `gap-2`, `gap-4`, and `gap-6` are used for spacing between elements.

---

## 3. Component Specification

### 3.1. Header

**Description:** The main application header, displaying the title and the real-time connection status.

-   **Structure:** A `header` element containing an `h1` for the title and a `div` for the status indicator.
-   **Status Indicator:** Composed of a colored dot and a text label.
    -   **Connecting:** Yellow dot (`bg-yellow-500`), text "Connecting...".
    -   **Connected:** Green dot (`bg-green-500`), text "Connected".
    -   **Disconnected:** Red dot (`bg-red-500`), text "Disconnected".

### 3.2. Monitor Card

**Description:** The primary component for displaying monitor information and providing top-level controls.

-   **Structure:**
    1.  **Card Container:** `bg-gray-800`, `rounded-xl`, `p-6`.
    2.  **Card Header:** Monitor icon, `h2` title, and settings button.
    3.  **Device ID:** `p` tag with `font-mono` and `text-gray-500`.
    4.  **Error Display (Conditional):** A red-themed box that appears only when the `monitor.error` property is present.
    5.  **Brightness Bars:** A section containing two `BrightnessBar` sub-components.
    6.  **Card Footer:** A bordered top (`border-t border-gray-700`), a label for "Auto-Brightness", and a `Toggle` component.
-   **States & Variants:**
    -   **Active State:** When `monitor.isActive` is `true`, the card has a primary-colored glow (`ring-2 ring-primary shadow-lg shadow-primary/20`).
    -   **Inactive State:** When `false`, the card has a standard gray border (`ring-1 ring-gray-700`).
-   **Interactions:**
    -   **Settings Button:** Triggers the display of the `SettingsModal` for this monitor.
    -   **Toggle:** Toggles the `isActive` state for the monitor.

### 3.3. Settings Modal

**Description:** A modal dialog for fine-tuning a monitor's algorithm parameters and device mapping.

-   **Structure:**
    1.  **Overlay:** A fixed-position, semi-transparent black overlay (`bg-black bg-opacity-70`).
    2.  **Modal Container:** `bg-gray-800`, `rounded-lg`, `max-w-lg`.
    3.  **Modal Header:** `h2` title and monitor name subtitle, with a bottom border.
    4.  **Content Area:** An `overflow-y-auto` section containing all settings controls.
    5.  **Modal Footer:** A container with a top border holding the `Cancel` and `Save Changes` buttons.
-   **Interactions:**
    -   Clicking the **overlay** closes the modal.
    -   Clicking inside the **modal container** does not close it (event propagation is stopped).
    -   **Detect Button:**
        -   **Default:** "Detect".
        -   **Loading:** Text changes to "Detecting..." and the button is `disabled`.
    -   **Cancel Button:** Closes the modal without saving changes.
    -   **Save Changes Button:** Triggers the save handler and closes the modal.

### 3.4. UI Widgets

#### Slider

**Description:** A standard range input for numeric settings.

-   **Structure:**
    1.  **Header:** A `div` containing the `label` and a `span` for the current numeric value (`font-mono`, `bg-gray-700`).
    2.  **Description:** A `p` tag with `text-sm text-gray-400`.
    3.  **Input:** An `<input type="range">` styled with `accent-primary`.

#### Toggle

**Description:** A switch for boolean settings.

-   **Structure:** A `<button>` with `role="switch"` containing a `span` for the sliding handle.
-   **States & Transitions:**
    -   **Enabled:** `bg-primary`, handle is `translate-x-5`.
    -   **Disabled:** `bg-gray-600`, handle is `translate-x-0`.
    -   Transitions for color and transform are applied to create a smooth sliding animation (`duration-200 ease-in-out`).

### 3.5. Animations & Transitions

-   **Card State Change:** The ring and shadow properties transition with `duration-300`.
-   **Brightness Bar Fill:** The `width` property transitions with `duration-500`.
-   **Loading Spinner:** A simple, continuous CSS rotation animation (`@keyframes spin`).
-   **Button/Interactive Focus:** All interactive elements have a focus ring (`focus:ring-2 focus:ring-primary-focus`).