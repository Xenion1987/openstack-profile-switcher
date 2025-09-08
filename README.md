# OpenStack Profile Switcher

A lightweight browser extension that lets you quickly switch between projects in the OpenStack Horizon dashboard.  
Supports multiple Horizon instances by allowing the user to add domains dynamically.

---

## Features

- 🔀 Switch between OpenStack projects directly from the extension popup
- 🌙 Light/Dark mode toggle
- 🔍 Search projects by name or description
- 📦 Domain support for multiple OpenStack instances

---

## Installation

### Regular installation (packed extension)

1. Build or download the `.zip` package of the extension.
2. Install it in your browser:
   - **Chrome / Chromium-based browsers**:  
     Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked** or **Install packed extension**, and select the zip file.
   - **Firefox**:  
     Go to `about:addons` → **Install Add-on From File…** and select the `.xpi` file (zipped package).

---

### Development installation (unpacked extension)

1. Clone or download this repository.
2. Open your browser’s extensions page:
   - **Chrome / Chromium**:  
     Go to `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the project folder.
   - **Firefox**:  
     Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, and select the `manifest.json` file from the project folder.
3. The extension will now run in development mode.  
   ⚠️ In Firefox, temporary add-ons disappear after a restart, so you’ll need to reload them.

---

## Domain permissions

The extension does not hardcode domains. Instead, you can add new OpenStack instances dynamically:

### Chrome / Chromium

- Open the extension **Options** page.
- Enter a domain (e.g. `https://openstack.domain.tld/`) and click **Add**.
- Chrome will show a permission dialog – confirm it to allow the extension access to that domain.

### Firefox

- Firefox does not support dynamic host permission requests in the same way as Chrome.
- You must edit the extension’s `manifest.json` before loading it, and add the required domains under `optional_host_permissions`. Example:
  ```json
  "optional_host_permissions": [
    "https://openstack.domain-a.tld/*",
    "https://openstack.domain-b.tld/*"
  ]
  ```
- After editing, reload the extension.

---

## Development notes

- The extension detects whether your Horizon is hosted under `/horizon` or `/dashboard`.
- Project switching is done via Horizon’s `/auth/switch/<project_id>/?next=…` endpoint.
- Projects are cached locally for 24h to reduce reload time.

---

## License

MIT
