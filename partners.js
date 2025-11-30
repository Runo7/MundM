document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("partners-track");
  if (!track) return;

  // Inhalt ein zweites Mal anhängen → nahtloser Loop
  track.innerHTML += track.innerHTML;
});
