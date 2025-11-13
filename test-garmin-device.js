const fetch = require('node-fetch');

const accessToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpLW9hdXRoLXNpZ25lci1wcm9kLTIwMjQtcTEifQ.eyJzY29wZSI6WyJQQVJUTkVSX1dSSVRFIiwiUEFSVE5FUl9SRUFEIiwiQ09OTkVDVF9SRUFEIiwiQ09OTkVDVF9XUklURSJdLCJpc3MiOiJodHRwczovL2RpYXV0aC5nYXJtaW4uY29tIiwicmV2b2NhdGlvbl9lbGlnaWJpbGl0eSI6WyJDTElFTlRfVVNFUl9SRVZPQ0FUSU9OIiwiTUFOQUdFRF9TVEFUVVMiXSwiY2xpZW50X3R5cGUiOiJQQVJUTkVSIiwiZXhwIjoxNzYzMTUxMTg0LCJpYXQiOjE3NjMwNjQ3ODQsImdhcm1pbl9ndWlkIjoiMjcyYTJjODItMGNiYi00OWZmLWFiZTktMGI2OGM1MDBmZDY3IiwianRpIjoiMTdhYjQ3YzMtODJlOS00NTMyLTkwMTMtMmZiZjA4MzZhZTY2IiwiY2xpZW50X2lkIjoiZWU2ODA5ZDUtYWJjMC00YTMzLWIzOGEtZDQzM2U1MDQ1OTg3In0.QDc8YNnbnKtA9hc3Pj7vQxzDxhPhHLqwwOifVkL_2mi4fiii_ahKCTpfVPbMAIp10rCeweD2UVjTg17P92JQPv0vBagotXm0ue4VfZzZHs75F18JZxDQDKgeoWf6pTavPEliRgdUbyaVm0OAFcu5CGcVasUCDrRqiITovO-hl5z1sUcNi5pLM_bjWVQpkVZ2nxkXqFrmvGq69ShPnrHAzMlF20rGHjDXM_hYOaJvlo4kjn8a_zZlTji6cllTrttMaHXdJfBSvsDJbfC4uk1P2wVtMo06yambFt4BgaXOLNtnY04ZsbdP6Cgz67m_VKXOTaoqfQlbSl9zv4x8MLr8tw';

async function fetchGarminActivities() {
    try {
        // Last 24 hours
        const endDate = Math.floor(Date.now() / 1000);
        const startDate = endDate - (24 * 60 * 60);

        console.log('Fetching activities from Garmin API...');
        console.log(`Time range: ${new Date(startDate * 1000).toISOString()} to ${new Date(endDate * 1000).toISOString()}`);

        const response = await fetch(
            `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startDate}&uploadEndTimeInSeconds=${endDate}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', response.status, errorText);
            return;
        }

        const activities = await response.json();
        console.log(`\nFound ${activities.length} activities\n`);

        if (activities.length > 0) {
            const firstActivity = activities[0];

            console.log('=== FIRST ACTIVITY FULL RESPONSE ===');
            console.log(JSON.stringify(firstActivity, null, 2));

            console.log('\n=== DEVICE-RELATED FIELDS ===');
            console.log('deviceId:', firstActivity.deviceId);
            console.log('deviceModel:', firstActivity.deviceModel);
            console.log('deviceName:', firstActivity.deviceName);
            console.log('manufacturerName:', firstActivity.manufacturerName);
            console.log('metadataDTO:', firstActivity.metadataDTO);

            console.log('\n=== ALL TOP-LEVEL KEYS ===');
            console.log(Object.keys(firstActivity));
        } else {
            console.log('No activities found in the last 24 hours. Trying last 7 days...');

            const startDate7 = endDate - (7 * 24 * 60 * 60);
            const response7 = await fetch(
                `https://apis.garmin.com/wellness-api/rest/activities?uploadStartTimeInSeconds=${startDate7}&uploadEndTimeInSeconds=${endDate}`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            if (response7.ok) {
                const activities7 = await response7.json();
                console.log(`Found ${activities7.length} activities in last 7 days`);
                if (activities7.length > 0) {
                    console.log('\n=== FIRST ACTIVITY (LAST 7 DAYS) ===');
                    console.log(JSON.stringify(activities7[0], null, 2));
                }
            }
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

fetchGarminActivities();
