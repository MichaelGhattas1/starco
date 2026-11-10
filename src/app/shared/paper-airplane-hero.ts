import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-paper-airplane-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
  template: `
    <svg class="trail out" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d="M0,46.6 L2,48 L22,50 L44,40 L68,30 L100,28.1"
        fill="none"
        stroke="#e6cf8a"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="0.2 14"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <svg class="trail back" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d="M0,75 L100,75"
        fill="none"
        stroke="#e6cf8a"
        stroke-width="3"
        stroke-linecap="round"
        stroke-dasharray="0.2 14"
        vector-effect="non-scaling-stroke"
      />
    </svg>
    <div class="mover">
      <div class="craft">
        <div class="model">
          <svg class="jet" viewBox="0 0 240 96">
            <path d="M22 50 L46 44 L50 56 Z" fill="#d5deea" />
            <path d="M34 52 L52 12 L70 50 Z" fill="#f4f7fb" />
            <path d="M46 46 L54 18 L62 46 Z" fill="#d4af37" />
            <path d="M118 50 L62 84 L92 84 L146 50 Z" fill="#e4ebf3" />
            <path d="M86 70 h28 a7 6 0 0 1 0 12 h-22 a8 6 0 0 1 0 -12 Z" fill="#b7c3d1" />
            <path d="M112 73 h6 v6 h-6 Z" fill="#7d8b9c" />
            <path d="M40 38 C92 28 168 28 206 34 C228 38 234 46 220 52 C168 62 96 62 42 54 C30 50 28 42 40 38 Z" fill="#f7f5f0" />
            <path d="M48 46 H214" stroke="#d4af37" stroke-width="2" fill="none" />
            <path d="M206 36 C220 40 226 46 214 50 C208 46 204 40 206 36 Z" fill="#143056" />
            <g fill="#143056">
              <circle cx="64" cy="44" r="1.7" />
              <circle cx="76" cy="44" r="1.7" />
              <circle cx="88" cy="44" r="1.7" />
              <circle cx="100" cy="44" r="1.7" />
              <circle cx="112" cy="44" r="1.7" />
              <circle cx="124" cy="44" r="1.7" />
              <circle cx="136" cy="44" r="1.7" />
              <circle cx="148" cy="44" r="1.7" />
              <circle cx="160" cy="44" r="1.7" />
              <circle cx="172" cy="44" r="1.7" />
              <circle cx="184" cy="44" r="1.7" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      --flight: 36s;
      position: fixed;
      z-index: 30;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      pointer-events: none;
      perspective: 900px;
    }

    .trail {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .out {
      animation: flight-trail var(--flight) linear infinite;
    }

    .back {
      animation: flight-back var(--flight) linear infinite;
    }

    .mover {
      position: absolute;
      inset: 0;
      animation: flight-path var(--flight) linear infinite;
    }

    .craft {
      position: absolute;
      top: 0;
      left: 0;
      width: 5rem;
      filter: drop-shadow(0 10px 6px rgb(7 20 34 / 0.35));
      transform-origin: 9% 50%;
      animation: flight-attitude var(--flight) linear infinite;
    }

    .model {
      position: relative;
      transform-style: preserve-3d;
      transform: rotateX(8deg);
    }

    .jet {
      display: block;
      width: 100%;
      height: auto;
    }

    @media (max-width: 991px) {
      :host {
        --flight: 40s;
        perspective: 700px;
      }

      .craft {
        width: 3.6rem;
      }
    }

    @media (max-width: 575px) {
      :host {
        --flight: 44s;
      }

      .craft {
        width: 2.7rem;
      }

      .model {
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        display: none;
      }
    }

    @keyframes flight-path {
      0% { opacity: 0; transform: translate3d(-12%, 38%, 0); }
      8% { opacity: 0.76; transform: translate3d(2%, 48%, 0); }
      18% { opacity: 0.76; transform: translate3d(22%, 50%, 0); }
      28% { opacity: 0.76; transform: translate3d(44%, 40%, 0); }
      38% { opacity: 0.76; transform: translate3d(68%, 30%, 0); }
      48% { opacity: 0.76; transform: translate3d(102%, 28%, 0); }
      52% { opacity: 0.76; transform: translate3d(110%, 50%, 0); }
      56% { opacity: 0.76; transform: translate3d(104%, 75%, 0); }
      70% { opacity: 0.76; transform: translate3d(68%, 75%, 0); }
      84% { opacity: 0.76; transform: translate3d(32%, 75%, 0); }
      94% { opacity: 0.55; transform: translate3d(2%, 75%, 0); }
      100% { opacity: 0; transform: translate3d(-14%, 75%, 0); }
    }

    @keyframes flight-attitude {
      0% { transform: translate(-9%, -50%) rotateX(6deg) rotateY(0deg) rotateZ(8deg) scale(0.82); }
      8% { transform: translate(-9%, -50%) rotateX(4deg) rotateY(0deg) rotateZ(6deg) scale(0.92); }
      18% { transform: translate(-9%, -50%) rotateX(2deg) rotateY(0deg) rotateZ(-2deg) scale(1); }
      28% { transform: translate(-9%, -50%) rotateX(4deg) rotateY(0deg) rotateZ(-8deg) scale(1); }
      38% { transform: translate(-9%, -50%) rotateX(3deg) rotateY(0deg) rotateZ(-4deg) scale(0.96); }
      48% { transform: translate(-9%, -50%) rotateX(4deg) rotateY(0deg) rotateZ(8deg) scale(0.92); }
      52% { transform: translate(-9%, -50%) rotateX(10deg) rotateY(90deg) rotateZ(18deg) scale(0.88); }
      56% { transform: translate(-9%, -50%) rotateX(4deg) rotateY(180deg) rotateZ(0deg) scale(0.96); }
      70% { transform: translate(-9%, -50%) rotateX(3deg) rotateY(180deg) rotateZ(0deg) scale(1); }
      84% { transform: translate(-9%, -50%) rotateX(3deg) rotateY(180deg) rotateZ(0deg) scale(0.96); }
      94% { transform: translate(-9%, -50%) rotateX(4deg) rotateY(180deg) rotateZ(0deg) scale(0.9); }
      100% { transform: translate(-9%, -50%) rotateX(4deg) rotateY(180deg) rotateZ(0deg) scale(0.82); }
    }

    @keyframes flight-trail {
      0% { opacity: 0; clip-path: inset(0 112% 0 0); }
      8% { opacity: 0.55; clip-path: inset(0 98% 0 0); }
      18% { opacity: 0.55; clip-path: inset(0 78% 0 0); }
      28% { opacity: 0.55; clip-path: inset(0 56% 0 0); }
      38% { opacity: 0.55; clip-path: inset(0 32% 0 0); }
      48% { opacity: 0.55; clip-path: inset(0 -2% 0 0); }
      62% { opacity: 0; clip-path: inset(0 -2% 0 0); }
      100% { opacity: 0; clip-path: inset(0 112% 0 0); }
    }

    @keyframes flight-back {
      0%, 52% { opacity: 0; clip-path: inset(0 0 0 100%); }
      56% { opacity: 0.55; clip-path: inset(0 0 0 100%); }
      70% { opacity: 0.55; clip-path: inset(0 0 0 68%); }
      84% { opacity: 0.55; clip-path: inset(0 0 0 32%); }
      94% { opacity: 0.4; clip-path: inset(0 0 0 2%); }
      100% { opacity: 0; clip-path: inset(0 0 0 0%); }
    }
  `,
})
export class PaperAirplaneHero {}
