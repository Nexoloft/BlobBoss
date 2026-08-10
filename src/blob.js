export class BlobCharacter {
  constructor(container) {
    this.container = container;
    this.stage = 0;
    this.streak = 0;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <svg viewBox="0 0 200 200" id="blob-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="blob-gradient" cx="50%" cy="40%">
            <stop offset="0%" id="grad-inner" stop-color="#a8e6a0"/>
            <stop offset="100%" id="grad-outer" stop-color="#4caf50"/>
          </radialGradient>
          <filter id="blob-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-opacity="0.2"/>
          </filter>
        </defs>
        <g id="blob-group" filter="url(#blob-shadow)">
          <path id="blob-body" d="M100,30 C140,30 170,60 170,100 C170,140 140,170 100,170 C60,170 30,140 30,100 C30,60 60,30 100,30 Z" fill="url(#blob-gradient)"/>
          <g id="blob-face">
            <circle id="eye-left" cx="75" cy="90" r="8" fill="#2d2d2d"/>
            <circle id="eye-right" cx="125" cy="90" r="8" fill="#2d2d2d"/>
            <ellipse id="eye-left-shine" cx="72" cy="87" rx="3" ry="3" fill="white" opacity="0.8"/>
            <ellipse id="eye-right-shine" cx="122" cy="87" rx="3" ry="3" fill="white" opacity="0.8"/>
            <path id="mouth" d="M85,125 Q100,140 115,125" stroke="#2d2d2d" stroke-width="3" fill="none" stroke-linecap="round"/>
          </g>
          <g id="accessories"></g>
        </g>
      </svg>
    `;
  }

  setStage(stage) {
    this.stage = stage;
    const svg = this.container.querySelector('#blob-svg');
    const gradInner = this.container.querySelector('#grad-inner');
    const gradOuter = this.container.querySelector('#grad-outer');
    const mouth = this.container.querySelector('#mouth');
    const eyeL = this.container.querySelector('#eye-left');
    const eyeR = this.container.querySelector('#eye-right');

    svg.classList.remove('stage-1', 'stage-2', 'stage-3', 'stage-4', 'celebrate', 'sad');

    if (stage === 0) return;

    svg.classList.add(`stage-${stage}`);

    if (stage >= 3) {
      gradInner.setAttribute('stop-color', '#ffab91');
      gradOuter.setAttribute('stop-color', '#e53935');
      mouth.setAttribute('d', 'M80,130 Q100,115 120,130');
      eyeL.setAttribute('r', '6');
      eyeR.setAttribute('r', '6');
    } else {
      gradInner.setAttribute('stop-color', '#a8e6a0');
      gradOuter.setAttribute('stop-color', '#4caf50');
      mouth.setAttribute('d', 'M85,125 Q100,140 115,125');
      eyeL.setAttribute('r', '8');
      eyeR.setAttribute('r', '8');
    }
  }

  setStreak(streak) {
    this.streak = streak;
    const accessories = this.container.querySelector('#accessories');
    const svg = this.container.querySelector('#blob-svg');
    accessories.innerHTML = '';

    svg.classList.remove('streak-sparkle', 'streak-rainbow');

    if (streak >= 5) {
      accessories.innerHTML = `
        <polygon points="100,15 105,25 115,25 107,32 110,42 100,36 90,42 93,32 85,25 95,25"
                 fill="#FFD700" stroke="#FFA000" stroke-width="1"/>
      `;
    }
    if (streak >= 3) {
      svg.classList.add('streak-sparkle');
    }
    if (streak >= 10) {
      svg.classList.add('streak-rainbow');
    }
  }

  celebrate() {
    const svg = this.container.querySelector('#blob-svg');
    svg.classList.add('celebrate');
    setTimeout(() => svg.classList.remove('celebrate'), 1500);
  }

  lookSad() {
    const svg = this.container.querySelector('#blob-svg');
    const mouth = this.container.querySelector('#mouth');
    mouth.setAttribute('d', 'M85,135 Q100,120 115,135');
    svg.classList.add('sad');
    setTimeout(() => {
      svg.classList.remove('sad');
      mouth.setAttribute('d', 'M85,125 Q100,140 115,125');
    }, 1500);
  }
}
