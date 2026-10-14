import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';

const POINTS = [
  { icon: 'lock', text: 'End-to-end encrypted messages' },
  { icon: 'key', text: 'No password to remember — sign in with a code' },
  { icon: 'group', text: 'Only people you add can reach you' },
];

const Wordmark = ({ inverse = false }) => (
  <Link to="/" className="inline-flex items-center gap-2" aria-label="Nexus home">
    <span className={`w-9 h-9 rounded-xl flex items-center justify-center
      ${inverse ? 'bg-content-inverse/15 ring-1 ring-content-inverse/25' : 'bg-gradient-to-br from-primary to-surface-inverse'}`}>
      <span className="font-display text-content-inverse text-xl leading-none pb-0.5">N</span>
    </span>
    <span className={`font-display text-title-lg tracking-tight ${inverse ? 'text-content-inverse' : 'text-content'}`}>
      Nexus
    </span>
  </Link>
);

export const AuthLayout = ({ title, subtitle, children, footer }) => (
  <div className="min-h-screen bg-bg grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
    {/* Brand panel — desktop only */}
    <aside className="hidden lg:flex relative overflow-hidden bg-surface-inverse text-content-inverse flex-col justify-between p-2xl">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(36rem 24rem at 10% 0%, rgb(212 154 174 / 0.35), transparent 65%), radial-gradient(28rem 22rem at 100% 100%, rgb(168 120 142 / 0.35), transparent 65%)',
        }}
      />

      <div className="relative">
        <Wordmark inverse />
      </div>

      <div className="relative max-w-md">
        <h2 className="text-display-lg font-display text-balance">
          Your words, <span className="italic text-accent">kept between you.</span>
        </h2>
        <ul className="mt-xl space-y-md">
          {POINTS.map(p => (
            <li key={p.text} className="flex items-center gap-sm text-body-lg text-content-inverse/85">
              <span className="w-9 h-9 rounded-lg bg-content-inverse/10 ring-1 ring-content-inverse/15 flex items-center justify-center flex-shrink-0">
                <Icon name={p.icon} className="text-[20px] text-accent" />
              </span>
              {p.text}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative text-body-sm text-content-inverse/50">&copy; {new Date().getFullYear()} Nexus</p>
    </aside>

    {/* Form panel */}
    <main className="relative flex flex-col px-md py-lg sm:px-xl">
      <div
        aria-hidden="true"
        className="lg:hidden pointer-events-none absolute inset-x-0 top-0 h-80"
        style={{ background: 'radial-gradient(30rem 16rem at 50% -20%, rgb(212 154 174 / 0.35), transparent 70%)' }}
      />

      <div className="relative lg:hidden">
        <Wordmark />
      </div>

      <div className="relative flex-1 flex items-center justify-center py-xl">
        <div className="w-full max-w-sm animate-fade-in-up">
          <h1 className="text-display-md font-display text-balance">{title}</h1>
          {subtitle && <p className="mt-xs text-body-lg text-content-secondary text-pretty">{subtitle}</p>}
          <div className="mt-xl">{children}</div>
          {footer && <div className="mt-xl pt-lg border-t border-border text-center text-body-md">{footer}</div>}
        </div>
      </div>
    </main>
  </div>
);

export const FormError = ({ children }) =>
  children ? (
    <div role="alert" className="mb-md p-sm pl-md bg-danger-subtle border border-danger/25 text-danger rounded-lg flex items-start gap-sm animate-fade-in">
      <Icon name="error" className="text-[20px] mt-px flex-shrink-0" />
      <span className="text-body-sm">{children}</span>
    </div>
  ) : null;
