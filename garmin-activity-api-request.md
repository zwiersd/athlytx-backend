# Email to Garmin Support for Activity API Access

**To:** developer-relations@garmin.com (or use the support ticket system)

**Subject:** Request to Enable Activity API on Test App

---

**Email Body:**

Dear Garmin Developer Relations,

Thank you for the instructions on adding Activity API to my production app. However, when I go to https://apis.garmin.com/tools/apiConfiguration, I find that the Activity API option is greyed out on my test app as well, and I cannot enable it myself.

**My Apps:**
- **Test App Name:** [YOUR TEST APP NAME HERE]
- **Test Consumer Key:** [YOUR TEST CONSUMER KEY - find it in the developer console]
- **Production App Name:** Athlytx
- **Production Consumer Key:** ee6809d5-abc0-4a33-b38a-d433e5045987

**Current Status:**
- Both test and production apps currently have Health API enabled
- Activity API is greyed out on both apps and cannot be enabled by me

**Request:**
Could you please enable Activity API on my test app so I can complete the testing and implementation as you requested? Once I successfully test the Activity API integration, I will provide:
1. Screenshots showing successful API calls
2. UX screenshots from my app
3. Documentation of the integration

**Use Case:**
My app (Athlytx) is a training load and heart rate zone analysis platform for endurance athletes. We need Activity API to:
- Pull individual workout details with HR zone breakdowns
- Calculate polarized training distribution (Zone 1/2 vs Zone 3+ time)
- Provide detailed activity-level analytics

I understand I need to test this on the test app first before it can be enabled on production. Please let me know if you need any additional information.

Thank you for your assistance!

Best regards,
[Your Name]

---

## Alternative: Check if Activity API is Already Enabled

Before sending the email, let's verify if Activity API is actually already enabled on your test app (greyed out because it's ON, not OFF):

1. Go to: https://apis.garmin.com/tools/apiConfiguration
2. Select your TEST app from the dropdown
3. Look at the Activity API checkbox
4. **Is there a checkmark in it?**
   - ✅ If YES (checked + greyed): Activity API is already enabled! You can test it.
   - ❌ If NO (unchecked + greyed): You need to email Garmin to enable it.

Let me know what you see!
