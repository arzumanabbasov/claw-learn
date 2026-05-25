'use client';

import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function LoginPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"DM Sans", sans-serif',
        padding: '24px',
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* Logo + name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(13,17,23,0.12)',
            }}
          >
            <Image src="/logo.png" alt="Claw Learn" width={64} height={64} style={{ objectFit: 'cover' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1
              style={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 700,
                fontSize: 28,
                color: 'var(--ink)',
                margin: 0,
              }}
            >
              Claw Learn
            </h1>
            <p
              style={{
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 14,
                color: 'var(--ink-faint)',
                margin: '4px 0 0',
              }}
            >
              AI-powered visual math tutor
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            width: '100%',
            background: 'white',
            border: '1px solid rgba(13,17,23,0.1)',
            borderRadius: 10,
            padding: '32px 28px',
            boxShadow: '0 2px 16px rgba(13,17,23,0.06)',
          }}
        >
          <h2
            style={{
              fontFamily: '"Playfair Display", serif',
              fontWeight: 700,
              fontSize: 20,
              color: 'var(--ink)',
              marginBottom: 6,
              textAlign: 'center',
            }}
          >
            Sign in to continue
          </h2>
          <p
            style={{
              fontSize: 13,
              color: 'var(--ink-faint)',
              textAlign: 'center',
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            3 free questions per day. No credit card needed.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Google */}
            <button
              onClick={() => signIn('google', { callbackUrl: '/' })}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                width: '100%',
                padding: '11px 16px',
                borderRadius: 6,
                border: '1px solid rgba(13,17,23,0.15)',
                background: 'white',
                color: 'var(--ink)',
                fontFamily: '"DM Sans", sans-serif',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--cream)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(13,17,23,0.25)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'white';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(13,17,23,0.15)';
              }}
            >
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>

        <p
          style={{
            fontSize: 12,
            color: 'var(--ink-faint)',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          By signing in you agree to our terms of service.
        </p>
      </motion.div>
    </div>
  );
}
