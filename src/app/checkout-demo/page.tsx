'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { StatusBadge } from '@/components/ui/StatusBadge';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutDemoPage() {
  const [amountRupees, setAmountRupees] = useState(3998); // ₹3,998 default (Runner Pro + Socks)
  const [currency, setCurrency] = useState('INR');
  const [customerName, setCustomerName] = useState('Demo Customer');
  const [customerEmail, setCustomerEmail] = useState('customer@example.com');
  const [customerPhone, setCustomerPhone] = useState('9999999999');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [stepLogs, setStepLogs] = useState<string[]>([]);
  const [verifiedPayment, setVerifiedPayment] = useState<any>(null);

  const addLog = (msg: string) => {
    setStepLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handlePay = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setVerifiedPayment(null);
    setStepLogs([]);

    try {
      const amountPaise = Math.round(amountRupees * 100);
      addLog(`Step 1: Calling POST /api/create-order with amount=${amountPaise} paise (₹${amountRupees})...`);

      // 1. Call Backend to create order
      const createRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt: `rcpt_demo_${Date.now()}`,
          notes: {
            flow: 'standard_web_checkout',
            customer: customerName,
          },
        }),
      });

      if (!createRes.ok) {
        const errData = await createRes.json();
        throw new Error(errData.error || 'Failed to create order on server');
      }

      const orderData = await createRes.json();
      addLog(`Step 1 Complete: Order created! Razorpay Order ID: ${orderData.order_id}`);

      // 2. Ensure Razorpay checkout script is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Razorpay Checkout SDK script is still loading. Please try again.');
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_sellflow';
      addLog(`Step 2: Launching Razorpay Standard Checkout modal with Key ID: ${keyId}...`);

      // 3. Configure Razorpay Standard Checkout options
      const options = {
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'SellFlow AI',
        description: `Order ${orderData.receipt}`,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=120&h=120&fit=crop',
        order_id: orderData.order_id,
        handler: async function (response: any) {
          addLog(`Payment Callback received from Razorpay Checkout modal.`);
          addLog(`Payment ID: ${response.razorpay_payment_id}`);
          addLog(`Order ID: ${response.razorpay_order_id}`);
          addLog(`Signature: ${response.razorpay_signature}`);

          // 4. Send all three to verify endpoint
          await verifyPaymentOnServer(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
        },
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notes: {
          product: 'SellFlow AI Demo Purchase',
        },
        theme: {
          color: '#DC2626', // Razorpay red
        },
        modal: {
          ondismiss: function () {
            setIsLoading(false);
            addLog('Checkout modal dismissed by user. Transaction cancelled safely.');
            setErrorMessage('Payment cancelled by user. Cart and state are preserved.');
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', function (resp: any) {
        setIsLoading(false);
        const desc = resp.error?.description || resp.error?.reason || 'Declined by test bank';
        addLog(`Payment failed: ${desc}`);
        setErrorMessage(`Payment declined: ${desc}. No amount was charged.`);
      });

      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setIsLoading(false);
      setErrorMessage(err.message || 'An unexpected error occurred during checkout.');
      addLog(`Error: ${err.message}`);
    }
  };

  const verifyPaymentOnServer = async (order_id: string, payment_id: string, signature: string) => {
    try {
      addLog(`Step 3: Submitting signatures to POST /api/verify-payment for HMAC-SHA256 verification...`);

      const verifyRes = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id,
          payment_id,
          signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        addLog(`Step 3 Complete: HMAC-SHA256 signature verified! Payment marked as PAID.`);
        setVerifiedPayment({
          order_id,
          payment_id,
          amountRupees,
          verifiedAt: new Date().toLocaleTimeString(),
        });
      } else {
        addLog(`Step 3 FAILED: Signature mismatch or verification error: ${verifyData.error}`);
        setErrorMessage(verifyData.error || 'Payment signature verification failed.');
      }
    } catch (err: any) {
      addLog(`Step 3 Network error: ${err.message}`);
      setErrorMessage('Network error communicating with verification server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--sf-border)] bg-[var(--sf-surface)] sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-sf border border-[var(--sf-border)] text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] sf-transition"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="font-semibold text-sm text-[var(--sf-text-primary)] tracking-tight">
              Razorpay Standard Checkout
            </span>
            <StatusBadge variant="warning">Test Mode</StatusBadge>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle variant="button" className="border-[var(--sf-border)] bg-transparent text-[var(--sf-text-muted)] hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)]" />
            <Link
              href="/store/apex-sports"
              className="text-[13px] font-medium text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)] sf-transition"
            >
              Storefront →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Checkout Trigger Card */}
          <div className="lg:col-span-6 space-y-6">
            <div className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-6 sm:p-8 shadow-sf">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-[var(--sf-text-primary)] tracking-tight">
                  Checkout Parameters
                </h2>
                <p className="text-xs text-[var(--sf-text-muted)] mt-1">
                  Calls <code className="text-brand-600 font-mono">/api/create-order</code> and verifies via <code className="text-brand-600 font-mono">/api/verify-payment</code>
                </p>
              </div>

              {/* Amount Presets */}
              <div className="space-y-4">
                <div>
                  <label className="block text-label mb-2">
                    Preset Amounts (₹)
                  </label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[499, 1499, 3499, 3998].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmountRupees(amt)}
                        className={`py-1.5 px-3 rounded-sf text-xs font-semibold tabular-nums sf-transition ${
                          amountRupees === amt
                            ? 'bg-brand-600 text-white'
                            : 'bg-[var(--sf-bg-alt)] text-[var(--sf-text-secondary)] hover:text-[var(--sf-text-primary)]'
                        }`}
                      >
                        ₹{amt.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--sf-text-muted)]">₹</span>
                    <input
                      type="number"
                      min={1}
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(Number(e.target.value))}
                      className="w-full pl-8 pr-4 py-2.5 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-sm font-semibold tabular-nums text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                    />
                  </div>
                  <span className="text-[11px] text-[var(--sf-text-muted)] mt-1 block font-mono">
                    Equals {amountRupees * 100} paise in minor units
                  </span>
                </div>

                {/* Prefill Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-label mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                    />
                  </div>

                  <div>
                    <label className="block text-label mb-1">
                      Customer Phone
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-sf border border-[var(--sf-border)] bg-[var(--sf-bg-alt)] text-xs text-[var(--sf-text-primary)] focus:outline-none focus:border-brand-500 sf-transition"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3.5 rounded-sf bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                {/* Success Card */}
                {verifiedPayment && (
                  <div className="p-4 rounded-sf bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Payment Verified & Settled</span>
                    </div>
                    <div className="font-mono text-[11px] space-y-0.5 pt-1">
                      <div>Order ID: <span className="font-bold">{verifiedPayment.order_id}</span></div>
                      <div>Payment ID: <span className="font-bold">{verifiedPayment.payment_id}</span></div>
                      <div>Amount: <span className="font-bold">₹{verifiedPayment.amountRupees}</span></div>
                      <div>Timestamp: {verifiedPayment.verifiedAt}</div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={isLoading || amountRupees < 1}
                  id="standard-checkout-pay-btn"
                  className="w-full mt-4 py-3 rounded-sf bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 sf-transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Checkout...</span>
                    </>
                  ) : (
                    <span>Pay ₹{amountRupees.toLocaleString('en-IN')} with Razorpay</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Real-Time Execution Console */}
          <div className="lg:col-span-6 space-y-6">
            <div className="border border-[var(--sf-border)] rounded-sf-lg bg-[var(--sf-surface)] p-6 sm:p-8 shadow-sf h-full flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--sf-border)] mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--sf-success)] animate-pulse" />
                  <h3 className="font-semibold text-sm text-[var(--sf-text-primary)]">Execution & Verification Ledger</h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--sf-text-muted)]">HMAC-SHA256</span>
              </div>

              <div className="flex-1 bg-[var(--sf-bg-alt)] rounded-sf p-4 border border-[var(--sf-border)] font-mono text-xs overflow-y-auto max-h-[380px] space-y-2 text-[var(--sf-text-secondary)]">
                {stepLogs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-[var(--sf-text-muted)] py-12">
                    <span>Click &quot;Pay with Razorpay&quot; to inspect the live transaction stream.</span>
                  </div>
                ) : (
                  stepLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`leading-relaxed ${
                        log.includes('Complete')
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : log.includes('Error') || log.includes('declined') || log.includes('cancelled')
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-[var(--sf-text-secondary)]'
                      }`}
                    >
                      {log}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--sf-border)] text-[11px] text-[var(--sf-text-muted)] flex items-center justify-between">
                <span>Key ID: <strong className="text-[var(--sf-text-primary)] font-mono">{process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_sellflow'}</strong></span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Secret: Server Protected</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
