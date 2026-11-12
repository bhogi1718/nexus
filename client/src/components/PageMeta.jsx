import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Title, description and canonical URL per route. index.html carries the
// landing page's values for crawlers that don't run scripts; this keeps the
// tab title and the tags right as the route changes.
const DEFAULT_META = {
  title: 'Nexus — Private, End-to-End Encrypted Messaging',
  description: 'Nexus is a private messenger with end-to-end encrypted messages and attachments, safety numbers and passwordless sign-in. Free, and nothing to install.',
};

const ROUTE_META = {
  '/login': {
    title: 'Sign in — Nexus',
    description: 'Sign in to Nexus with a one-time code sent to your email. No password needed.',
  },
  '/signup': {
    title: 'Create your account — Nexus',
    description: 'Create a free Nexus account in about a minute and start messaging privately.',
  },
  '/chat': {
    title: 'Chats — Nexus',
    description: DEFAULT_META.description,
  },
};

const setAttribute = (selector, attribute, value) => {
  document.head.querySelector(selector)?.setAttribute(attribute, value);
};

export const PageMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = ROUTE_META[pathname] || DEFAULT_META;
    document.title = meta.title;
    setAttribute('meta[name="description"]', 'content', meta.description);
    setAttribute('link[rel="canonical"]', 'href', `${window.location.origin}${pathname === '/' ? '/' : pathname}`);
  }, [pathname]);

  return null;
};
