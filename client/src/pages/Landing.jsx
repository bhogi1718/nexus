import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';

const FEATURES = [
  {
    icon: 'lock',
    title: 'End-to-end encrypted',
    body: 'Text messages are locked on your device with keys that never leave it. Every message gets a fresh key, so one exposed key can’t unlock the rest. Not even Nexus can read them.',
  },
  {
    icon: 'bolt',
    title: 'Instant delivery',
    body: 'A persistent realtime connection keeps conversations in sync the moment a message is sent, with typing and read indicators built in.',
  },
  {
    icon: 'group',
    title: 'Only who you choose',
    body: 'Conversations start from your contacts. No open directory, no discovery, no suggestions — nobody finds you by accident.',
  },
];

const STEPS = [
  { n: '01', title: 'Verify your email', body: 'A one-time code signs you in. No password to choose, forget, or reuse.' },
  { n: '02', title: 'Add a contact', body: 'Exchange email addresses and add each other. Conversations begin on your terms.' },
  { n: '03', title: 'Start talking', body: 'Send messages, photos and files, with typing and read indicators in real time.' },
];

// Fades sections in as they scroll into view; a no-op under reduced motion.
const useReveal = () => {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, shown];
};

const Reveal = ({ children, delay = 0, className = '' }) => {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-slow ease-enter ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'} ${className}`}
    >
      {children}
    </div>
  );
};

// Above-the-fold entrance: pure CSS, so the headline (the page's largest paint)
// never waits on an IntersectionObserver that a background tab may throttle.
const HeroIn = ({ children, delay = 0, className = '' }) => (
  <div className={`animate-fade-in-up ${className}`} style={{ animationDelay: `${delay}ms` }}>
    {children}
  </div>
);

const Wordmark = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-surface-inverse flex items-center justify-center">
      <span className="font-display text-content-inverse text-lg leading-none pb-0.5">N</span>
    </span>
    <span className="font-display text-title-lg tracking-tight">Nexus</span>
  </span>
);

export const Landing = () => (
  <div className="min-h-screen bg-bg text-content">
    {/* Nav */}
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="max-w-content mx-auto px-md md:px-lg h-16 flex items-center justify-between">
        <Wordmark />
        <nav className="flex items-center gap-xs">
          <Link to="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </nav>
      </div>
    </header>

    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Soft mauve wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              'radial-gradient(60rem 30rem at 50% -10%, rgb(212 154 174 / 0.35), transparent 70%), radial-gradient(40rem 24rem at 85% 10%, rgb(168 120 142 / 0.18), transparent 70%)',
          }}
        />

        <div className="max-w-content mx-auto px-md md:px-lg pt-3xl pb-2xl md:pt-4xl md:pb-3xl">
          <div className="max-w-3xl mx-auto text-center">
            <HeroIn>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-caption text-content-secondary shadow-xs">
                <Icon name="shield_lock" className="text-[16px] text-accent-strong" />
                End-to-end encrypted
              </span>
            </HeroIn>

            <HeroIn delay={80}>
              <h1 className="mt-lg text-display-xl font-display text-balance">
                Conversations that stay
                <span className="block text-primary italic">between the two of you.</span>
              </h1>
            </HeroIn>

            <HeroIn delay={160}>
              <p className="mt-md text-body-lg md:text-lg text-content-secondary max-w-xl mx-auto text-pretty">
                Nexus is a messenger built around a simple idea — your words belong to you.
                End-to-end encrypted, delivered instantly, and only reachable by people you choose.
              </p>
            </HeroIn>

            <HeroIn delay={240}>
              <div className="mt-xl flex flex-col sm:flex-row gap-sm justify-center">
                <Link to="/signup" className="sm:w-auto">
                  <Button size="lg" iconRight="arrow_forward" fullWidth>Create your account</Button>
                </Link>
                <Link to="/login" className="sm:w-auto">
                  <Button size="lg" variant="secondary" fullWidth>I already have one</Button>
                </Link>
              </div>
            </HeroIn>
          </div>

          {/* Product preview */}
          <HeroIn delay={320} className="mt-2xl md:mt-3xl">
            <ConversationPreview />
          </HeroIn>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-content mx-auto px-md md:px-lg py-2xl md:py-3xl">
        <Reveal className="text-center max-w-2xl mx-auto">
          <h2 className="text-display-md font-display text-balance">Built for the conversations that matter</h2>
          <p className="mt-sm text-body-lg text-content-secondary text-pretty">
            Every part of Nexus is shaped around keeping what you say between the people saying it.
          </p>
        </Reveal>

        <div className="mt-xl grid gap-md md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <article className="h-full bg-surface border border-border rounded-2xl p-lg shadow-xs transition-all duration-base ease-enter hover:shadow-md hover:-translate-y-1">
                <span className="w-11 h-11 rounded-xl bg-surface-accent flex items-center justify-center">
                  <Icon name={f.icon} className="text-[22px] text-primary" />
                </span>
                <h3 className="mt-md text-title-lg font-display">{f.title}</h3>
                <p className="mt-xs text-body-md text-content-secondary text-pretty">{f.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-surface-inverse text-content-inverse">
        <div className="max-w-content mx-auto px-md md:px-lg py-2xl md:py-3xl">
          <Reveal className="text-center max-w-2xl mx-auto">
            <h2 className="text-display-md font-display text-balance">Three steps to your first message</h2>
          </Reveal>

          <div className="mt-xl grid gap-lg md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="relative">
                  <span className="font-display text-display-lg text-content-inverse/25 leading-none">{s.n}</span>
                  <h3 className="mt-sm text-title-lg font-display">{s.title}</h3>
                  <p className="mt-xs text-body-md text-content-inverse/70 text-pretty">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-content mx-auto px-md md:px-lg py-2xl md:py-3xl">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-lg py-2xl md:py-3xl text-center shadow-sm">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(40rem 20rem at 50% 0%, rgb(212 154 174 / 0.28), transparent 70%)' }}
            />
            <div className="relative">
              <h2 className="text-display-md font-display text-balance">Start a conversation worth protecting</h2>
              <p className="mt-sm text-body-lg text-content-secondary max-w-lg mx-auto text-pretty">
                Free to use. No password to manage. Takes about a minute to set up.
              </p>
              <Link to="/signup" className="inline-block mt-lg">
                <Button size="lg" iconRight="arrow_forward">Create your account</Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>

    <footer className="border-t border-border">
      <div className="max-w-content mx-auto px-md md:px-lg py-lg flex flex-col sm:flex-row items-center justify-between gap-sm">
        <Wordmark />
        <p className="text-body-sm text-content-muted">
          &copy; {new Date().getFullYear()} Nexus. Private messaging.
        </p>
      </div>
    </footer>
  </div>
);

// Static, non-interactive illustration of the product.
const ConversationPreview = () => (
  <div className="relative mx-auto max-w-3xl">
    <div className="rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-md py-2.5 border-b border-border bg-surface-raised">
        <span className="w-2.5 h-2.5 rounded-full bg-border-strong" />
        <span className="w-2.5 h-2.5 rounded-full bg-border-strong/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-border-strong/40" />
        <span className="ml-auto inline-flex items-center gap-1 text-caption text-content-muted">
          <Icon name="lock" className="text-[14px]" />
          Encrypted
        </span>
      </div>

      <div className="p-md md:p-lg space-y-3 bg-bg">
        <PreviewBubble side="in">Did the venue confirm for Saturday?</PreviewBubble>
        <PreviewBubble side="out">Just got the email — we're set for 7pm.</PreviewBubble>
        <PreviewBubble side="in">Perfect. Sending the guest list over now.</PreviewBubble>
        <div className="flex items-center gap-1.5 pl-1 pt-1" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-border-strong animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  </div>
);

const PreviewBubble = ({ side, children }) => {
  const isOut = side === 'out';
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] px-3.5 py-2.5 text-body-md shadow-xs ${
          isOut
            ? 'bg-primary text-content-on-primary rounded-2xl rounded-br-md'
            : 'bg-surface text-content border border-border rounded-2xl rounded-bl-md'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default Landing;
