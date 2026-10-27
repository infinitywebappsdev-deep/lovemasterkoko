(function () {
  try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      var now = new Date();
      var watHour = (now.getUTCHours() + 1) % 24;
      var watMin = now.getUTCMinutes();
      var watMinutes = watHour * 60 + watMin;
      var isLightSchedule = watMinutes >= 420 && watMinutes < 1140;
      var manual = null;
      if (typeof sessionStorage !== 'undefined') {
        manual = sessionStorage.getItem('banky-theme-manual');
      }
      var isDark = manual === 'dark' ? true : manual === 'light' ? false : !isLightSchedule;
      document.documentElement.classList.toggle('dark', isDark);
    }
    var s = null;
    if (typeof localStorage !== 'undefined') {
      s = localStorage.getItem('banky-color-scheme');
    }
    if (s === 'navy' || s === 'gold') {
      document.documentElement.setAttribute('data-scheme', s);
    } else {
      document.documentElement.setAttribute('data-scheme', 'gold');
    }
  } catch (e) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-scheme', 'gold');
    }
  }
})();
