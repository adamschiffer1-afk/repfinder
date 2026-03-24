window.initTracking = function () {
  const input = document.getElementById("trackingInput");
  const btn = document.getElementById("trackBtn");

  if (!input || !btn) return;

  btn.addEventListener("click", () => {
    const code = input.value.trim();
    if (!code) return;

    const url = `https://17track.net/en/track#nums=${code}`;
    window.open(url, "_blank");
  });
};