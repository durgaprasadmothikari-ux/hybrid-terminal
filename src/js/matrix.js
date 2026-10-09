// Cyber Matrix Digital Rain Screensaver

class MatrixRain {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.animationId = null;
    this.active = false;

    // Characters: Katakana, Numbers, Operators
    this.characters = '0123456789ABCDEF010101XYZΩλπµ$#@!%&*<>:{}[]|+-=~';
    this.fontSize = 15;
    this.columns = 0;
    this.drops = [];

    this.initEvents();
  }

  initEvents() {
    window.addEventListener('resize', () => {
      if (this.active) this.resize();
    });

    this.canvas.addEventListener('click', () => {
      this.stop();
    });

    window.addEventListener('keydown', (e) => {
      if (this.active && e.key !== 'Control') {
        this.stop();
      }
    });
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.columns = Math.floor(this.canvas.width / this.fontSize);
    this.drops = Array(this.columns).fill(1);
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.canvas.classList.add('active');
    this.resize();

    const draw = () => {
      // Translucent black trail
      this.ctx.fillStyle = 'rgba(6, 11, 8, 0.08)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      const computed = getComputedStyle(document.body);
      const primaryColor = computed.getPropertyValue('--neon-primary').trim() || '#00ff66';

      this.ctx.fillStyle = primaryColor;
      this.ctx.font = `${this.fontSize}px 'JetBrains Mono', monospace`;

      for (let i = 0; i < this.drops.length; i++) {
        const text = this.characters.charAt(Math.floor(Math.random() * this.characters.length));
        const x = i * this.fontSize;
        const y = this.drops[i] * this.fontSize;

        // Bright white/cyan leader head
        if (Math.random() > 0.85) {
          this.ctx.fillStyle = '#ffffff';
          this.ctx.fillText(text, x, y);
          this.ctx.fillStyle = primaryColor;
        } else {
          this.ctx.fillText(text, x, y);
        }

        if (y > this.canvas.height && Math.random() > 0.975) {
          this.drops[i] = 0;
        }
        this.drops[i]++;
      }

      this.animationId = requestAnimationFrame(draw);
    };

    draw();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.canvas.classList.remove('active');
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toggle() {
    if (this.active) this.stop();
    else this.start();
  }
}

window.MatrixRain = MatrixRain;
