# Garmin UX Screenshot Checklist

**Purpose:** Document all Garmin branding and UX flow for production compliance
**Deadline:** November 19, 2025
**Submission:** Part of Garmin production approval package

---

## Required Screenshots

### 1. Device Connection Screen ✅
**What to Capture:**
- "Connect with Garmin" button with official branding
- Garmin Connect icon/logo visible
- Clear call-to-action for user authorization

**File Location in App:**
- Frontend: [index.html](frontend/index.html) - Device cards section
- Look for: `<button class="connect-btn btn-garmin">`

**Screenshot Name:** `01-garmin-connect-button.png`

**Notes:**
- Show full device connection card
- Ensure Garmin logo is visible
- Include surrounding UI for context

---

### 2. OAuth Authorization Flow ✅
**What to Capture:**
- Garmin OAuth consent screen (Garmin's page)
- Shows permissions being requested
- Garmin branding on authorization page

**File Location:**
- This is Garmin's hosted page at `connect.garmin.com`
- Triggered when user clicks "Connect with Garmin"

**Screenshot Name:** `02-garmin-oauth-consent.png`

**Notes:**
- Take screenshot of Garmin's authorization page
- Shows what permissions Athlytx is requesting
- Demonstrates proper OAuth flow

---

### 3. Garmin Data Tab Header ✅
**What to Capture:**
- Garmin logo in tab header
- "Garmin Health & Wellness Data" title
- Activity summary cards (activities, distance, avg HR, training time)
- Clear Garmin attribution

**File Location in App:**
- Frontend: [index.html](frontend/index.html) - Line ~519-548
- Tab ID: `#garmin`
- Logo: `src/images/Garmin.svg`

**Screenshot Name:** `03-garmin-data-tab-header.png`

**Notes:**
- Show top portion of Garmin tab
- Include Garmin.svg logo (45px height)
- Show summary statistics
- Demonstrate proper attribution

---

### 4. Activity List Display ✅
**What to Capture:**
- List of activities from Garmin
- Activity details (type, duration, distance, HR)
- Garmin attribution visible
- Data clearly sourced from Garmin

**File Location in App:**
- Frontend: [index.html](frontend/index.html)
- Element: `#garminActivitiesList`

**Screenshot Name:** `04-garmin-activities-list.png`

**Notes:**
- Show actual Garmin-sourced activities
- Include activity metadata
- Demonstrate data integration working

---

### 5. Heart Rate Zone Charts ✅
**What to Capture:**
- HR zone breakdown chart
- Activity types chart
- Training volume chart
- Garmin branding visible in context

**File Location in App:**
- Frontend: [index.html](frontend/index.html)
- Charts:
  - `#garminZonesChart`
  - `#garminActivityTypesChart`
  - `#garminVolumeChart`

**Screenshot Name:** `05-garmin-hr-zone-charts.png`

**Notes:**
- Show all three charts if possible
- Demonstrate analytics on Garmin data
- Include Garmin attribution in view

---

### 6. Footer Attribution ✅
**What to Capture:**
- "Powered by Garmin, Strava, Whoop, and Oura" text
- All partner logos including Garmin.svg
- Proper brand logo sizing and placement

**File Location in App:**
- Frontend: [index.html](frontend/index.html) - Line ~863-869
- Class: `.footer-brands`
- Logo: `src/images/Garmin.svg`

**Screenshot Name:** `06-garmin-footer-attribution.png`

**Notes:**
- Show complete footer section
- Ensure all partner logos visible
- Demonstrate proper co-branding

---

### 7. Complete UX Flow (Optional but Recommended) ✅
**What to Capture:**
- Side-by-side or sequential images showing:
  1. Before connection (Connect button)
  2. OAuth authorization
  3. After connection (Data displayed)

**Screenshot Name:** `07-garmin-complete-flow.png`

**Notes:**
- Can be a multi-panel image
- Shows end-to-end user experience
- Demonstrates integration working

---

## How to Take Screenshots

### Preparation
1. Ensure you have active Garmin connection with real data
2. Clear browser console/dev tools from view
3. Use clean browser window (no extensions showing)
4. Ensure good lighting if showing on actual screen
5. Use high resolution (at least 1920x1080)

### Tools
- **Mac:** Cmd+Shift+4 (select area) or Cmd+Shift+3 (full screen)
- **Windows:** Windows+Shift+S (Snip & Sketch)
- **Browser DevTools:** F12 → Device Toolbar (for mobile views if needed)

### Best Practices
- Capture at actual size (no zooming)
- Include enough context to understand feature
- Ensure Garmin branding is clearly visible
- Use descriptive file names
- Save as PNG for quality

---

## Screenshot Organization

### Folder Structure
```
/screenshots-garmin-compliance/
├── 01-garmin-connect-button.png
├── 02-garmin-oauth-consent.png
├── 03-garmin-data-tab-header.png
├── 04-garmin-activities-list.png
├── 05-garmin-hr-zone-charts.png
├── 06-garmin-footer-attribution.png
└── 07-garmin-complete-flow.png (optional)
```

### Submission Format
- All screenshots in single ZIP file
- File name: `athlytx-garmin-ux-screenshots-YYYYMMDD.zip`
- Include this checklist as `README.md` in ZIP

---

## Quality Checklist

Before submitting, verify each screenshot has:

- [ ] Garmin branding clearly visible
- [ ] High resolution (readable text)
- [ ] No sensitive user data (or use test account)
- [ ] Proper attribution to Garmin
- [ ] Context showing feature purpose
- [ ] Clean UI (no error messages, loading states)
- [ ] Accurate representation of production app

---

## Additional Documentation to Include

Along with screenshots, prepare:

1. **Screenshot Descriptions Document**
   - Brief caption for each image
   - Explains what compliance requirement it demonstrates

2. **Brand Guidelines Reference**
   - Note which GCDP brand guidelines followed
   - List all Garmin assets used (Garmin.svg, GarminConnect.png)

3. **UX Flow Description**
   - Written description of complete user journey
   - From connection → authorization → data display

---

## Timeline

**November 18, 2025:**
- Ensure Garmin connection has real activity data
- Test all screens working correctly
- Begin taking screenshots

**November 19, 2025:**
- Complete all screenshots
- Review quality and completeness
- Create ZIP package
- Prepare submission

**November 20, 2025:**
- Submit to Garmin support ticket

---

## Notes

- Use a test Garmin account if concerned about showing real data
- Ensure activities shown are recent (demonstrates active integration)
- If any screenshot doesn't clearly show branding, retake it
- Keep original high-res versions as backup

---

## Submission Checklist

Before sending to Garmin:

- [ ] All 6-7 screenshots captured
- [ ] Each shows clear Garmin branding
- [ ] Screenshots demonstrate all compliance points
- [ ] Files organized in folder structure
- [ ] Descriptive file names used
- [ ] Quality checked (resolution, clarity)
- [ ] ZIP file created
- [ ] README included in ZIP
- [ ] Ready to attach to Garmin support ticket

---

## Contact for Questions

If any issues with screenshots:
- Review Garmin API Brand Guidelines
- Check GCDP Branding Assets package
- Reference similar approved apps
- Contact Garmin support for clarification
