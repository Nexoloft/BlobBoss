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
          <radialGradient id="blob-gradient" cx="50%" cy="35%">
            <stop offset="0%" id="grad-inner" stop-color="#c8f7c0"/>
            <stop offset="100%" id="grad-outer" stop-color="#7ed67a"/>
          </radialGradient>
          <radialGradient id="blush-gradient">
            <stop offset="0%" stop-color="#ffb3b3" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#ffb3b3" stop-opacity="0"/>
          </radialGradient>
          <filter id="blob-shadow">
            <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.15"/>
          </filter>
          <filter id="eye-glow">
            <feGaussianBlur stdDeviation="0.5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <g id="blob-group" filter="url(#blob-shadow)">
          <path id="blob-body" d="M100,28 C145,28 172,55 175,98 C178,141 150,172 100,174 C50,172 22,141 25,98 C28,55 55,28 100,28 Z" fill="url(#blob-gradient)"/>
          <g id="blob-face">
            <!-- Big kawaii eyes -->
            <ellipse id="eye-left" cx="72" cy="92" rx="14" ry="15" fill="#2d2d2d"/>
            <ellipse id="eye-right" cx="128" cy="92" rx="14" ry="15" fill="#2d2d2d"/>
            <!-- Large primary highlights -->
            <ellipse id="eye-left-shine" cx="67" cy="85" rx="6" ry="7" fill="white" opacity="0.9"/>
            <ellipse id="eye-right-shine" cx="123" cy="85" rx="6" ry="7" fill="white" opacity="0.9"/>
            <!-- Small secondary highlights -->
            <circle cx="78" cy="97" r="3" fill="white" opacity="0.6"/>
            <circle cx="134" cy="97" r="3" fill="white" opacity="0.6"/>
            <!-- Blush cheeks -->
            <ellipse id="blush-left" cx="52" cy="112" rx="12" ry="8" fill="url(#blush-gradient)"/>
            <ellipse id="blush-right" cx="148" cy="112" rx="12" ry="8" fill="url(#blush-gradient)"/>
            <!-- Small kawaii mouth -->
            <path id="mouth" d="M93,130 Q100,137 107,130" stroke="#2d2d2d" stroke-width="2.5" fill="none" stroke-linecap="round"/>
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
      mouth.setAttribute('d', 'M90,133 Q100,126 110,133');
      eyeL.setAttribute('rx', '11');
      eyeL.setAttribute('ry', '12');
      eyeR.setAttribute('rx', '11');
      eyeR.setAttribute('ry', '12');
    } else {
      gradInner.setAttribute('stop-color', '#c8f7c0');
      gradOuter.setAttribute('stop-color', '#7ed67a');
      mouth.setAttribute('d', 'M93,130 Q100,137 107,130');
      eyeL.setAttribute('rx', '14');
      eyeL.setAttribute('ry', '15');
      eyeR.setAttribute('rx', '14');
      eyeR.setAttribute('ry', '15');
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
    mouth.setAttribute('d', 'M93,136 Q100,129 107,136');
    svg.classList.add('sad');
    setTimeout(() => {
      svg.classList.remove('sad');
      mouth.setAttribute('d', 'M93,130 Q100,137 107,130');
    }, 1500);
  }
}
