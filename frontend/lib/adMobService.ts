declare global {
  interface Window {
    gapi?: any;
    googletag?: any;
  }
}

// Google AdMob Test Ad Unit IDs
const TEST_AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917'; // Rewarded video test ad

export const loadAdMobScript = (): Promise<void> => {
  return new Promise((resolve) => {
    // Check if already loaded
    if (window.googletag && window.googletag.cmd) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-app-pub-3940256099942544~3419581409';
    script.async = true;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      console.error('Failed to load AdMob');
      resolve(); // Continue anyway
    };
    document.head.appendChild(script);
  });
};

export const showRewardedAd = (): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      if (!window.googletag) {
        console.warn('Google Ad Manager not available, using fallback');
        resolve(false);
        return;
      }

      // Push command to initialize rewarded ad
      window.googletag = window.googletag || { cmd: [] };
      window.googletag.cmd.push(() => {
        // Create hidden div for ad
        const adDiv = document.createElement('div');
        adDiv.id = 'google-rewarded-ad';
        adDiv.style.display = 'none';
        document.body.appendChild(adDiv);

        // Define rewarded slot
        const rewardedSlot = window.googletag
          .defineOutOfPageSlot(TEST_AD_UNIT_ID, window.googletag.enums.OutOfPageFormat.REWARDED)
          .addService(window.googletag.pubads());

        // Listen for ad ready
        window.googletag.pubads().addEventListener('rewardedSlotReady', (event: any) => {
          console.log('Ad ready, making user decision...');
          event.makeRewardedUserDecision();
        });

        // Listen for ad close
        window.googletag.pubads().addEventListener('rewardedSlotClosed', () => {
          console.log('Ad closed');
          resolve(true);
          // Cleanup
          const element = document.getElementById('google-rewarded-ad');
          if (element) element.remove();
        });

        // Listen for reward granted
        window.googletag.pubads().addEventListener('rewardedSlotGranted', () => {
          console.log('Reward granted!');
        });

        window.googletag.enableServices();
        window.googletag.display(rewardedSlot);
      });

      // Timeout fallback - if ad doesn't load in 10 seconds, use fallback
      setTimeout(() => {
        resolve(false);
      }, 10000);
    } catch (error) {
      console.error('Error showing ad:', error);
      resolve(false);
    }
  });
};
