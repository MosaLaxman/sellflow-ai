'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { StoreHeader } from '@/components/store/StoreHeader';
import { ChatBox, ChatMessage } from '@/components/store/ChatBox';
import { ShopView } from '@/components/store/ShopView';
import { ProductCardData } from '@/components/store/ProductCard';
import { CartDrawer, CartItemData } from '@/components/store/CartDrawer';
import { CheckoutModal } from '@/components/store/CheckoutModal';
import { PaymentRecoveryModal, PaymentRecoveryType } from '@/components/store/PaymentRecoveryModal';
import { CheckCircle2, ShoppingBag, Loader2, Clock, X, Plus, Minus, Check, Trash2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function StorefrontPage() {
  const params = useParams();
  const merchantSlug = (params?.merchantSlug as string) || 'apex-sports';

  // Navigation Mode
  const [activeMode, setActiveMode] = useState<'chat' | 'shop'>('chat');

  // Merchant & Catalog State
  const [merchant, setMerchant] = useState<any>(null);
  const [catalogProducts, setCatalogProducts] = useState<ProductCardData[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [stockNotice, setStockNotice] = useState<string | null>(null);

  // Conversational State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Cart State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItemData[]>([]);
  const [cartTotalMinor, setCartTotalMinor] = useState(0);
  const [cartUpsellProposal, setCartUpsellProposal] = useState<any>(null);
  const [dismissedUpsellIds, setDismissedUpsellIds] = useState<Set<string>>(new Set());
  const [isCartUpdating, setIsCartUpdating] = useState(false);

  // Quick lookup dictionary for quantities in cart: productId -> quantity
  const cartQuantities = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of cartItems) {
      map[item.productId] = (map[item.productId] || 0) + item.quantity;
    }
    return map;
  }, [cartItems]);

  // Checkout & Payment State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<any>(null);

  // In-App Payment Recovery Modal State
  const [recoveryModalState, setRecoveryModalState] = useState<{
    isOpen: boolean;
    type: PaymentRecoveryType;
    failureReason?: string | null;
    retryCount: number;
  }>({
    isOpen: false,
    type: 'FAILED',
    failureReason: null,
    retryCount: 0,
  });
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  // 1. Load Merchant & Catalog and restore chat history on initial mount
  useEffect(() => {
    const savedToken = localStorage.getItem(`mp_session_${merchantSlug}`);
    if (savedToken) setSessionToken(savedToken);

    // Restore saved chat conversation history (persists for 24 hours across refreshes)
    try {
      const savedChatRaw = localStorage.getItem(`sellflow_chat_${merchantSlug}`);
      if (savedChatRaw) {
        const savedChat = JSON.parse(savedChatRaw);
        const isRecent = savedChat.timestamp && Date.now() - savedChat.timestamp < 24 * 60 * 60 * 1000;
        if (isRecent && Array.isArray(savedChat.messages) && savedChat.messages.length > 0) {
          setMessages(savedChat.messages);
          if (savedChat.conversationId) setConversationId(savedChat.conversationId);
        }
      }
    } catch (err) {
      console.error('Error restoring chat history:', err);
    }

    fetchCatalog();
  }, [merchantSlug]);

  // Persist chat messages whenever updated
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(
          `sellflow_chat_${merchantSlug}`,
          JSON.stringify({
            messages,
            conversationId,
            timestamp: Date.now(),
          })
        );
      } catch (err) {
        console.error('Error persisting chat history:', err);
      }
    }
  }, [messages, conversationId, merchantSlug]);

  const handleClearChat = () => {
    setMessages([]);
    setConversationId(null);
    try {
      localStorage.removeItem(`sellflow_chat_${merchantSlug}`);
    } catch (_) {}
  };

  // Sync Cart whenever sessionToken is established
  useEffect(() => {
    if (sessionToken) {
      fetchCart(sessionToken);
    }
  }, [sessionToken]);

  const fetchCatalog = async () => {
    try {
      setIsLoadingCatalog(true);
      const res = await fetch(`/api/store/${merchantSlug}/catalog`);
      if (res.ok) {
        const data = await res.json();
        setMerchant(data.merchant);
        setCatalogProducts(data.products || []);
      }
    } catch (err) {
      console.error('Failed to fetch catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const fetchCart = async (token: string) => {
    try {
      const res = await fetch(`/api/store/${merchantSlug}/cart?sessionToken=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        setCartItems(data.items || []);
        setCartTotalMinor(data.totalMinor || 0);
        if (data.upsellProposal?.product?.id && dismissedUpsellIds.has(data.upsellProposal.product.id)) {
          setCartUpsellProposal(null);
        } else {
          setCartUpsellProposal(data.upsellProposal || null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch cart:', err);
    }
  };

  // 2. Chat Handler
  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const res = await fetch(`/api/store/${merchantSlug}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionToken,
          conversationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sessionToken && data.sessionToken !== sessionToken) {
          setSessionToken(data.sessionToken);
          localStorage.setItem(`mp_session_${merchantSlug}`, data.sessionToken);
        }
        if (data.conversationId) setConversationId(data.conversationId);

        const botMsg: ChatMessage = {
          id: `bot_${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          recommendations: data.recommendations,
          upsellProposal: data.upsellProposal,
        };

        setMessages((prev) => [...prev, botMsg]);

        // Synchronize cart state in case the AI added/modified cart items via tools
        if (data.sessionToken || sessionToken) {
          await fetchCart(data.sessionToken || sessionToken);
        }
      } else {
        const errData = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            role: 'assistant',
            content: errData.error || 'I encountered an error connecting to our catalog. Please retry.',
          },
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'A network error occurred. Please check your connection and try again.',
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 3. Cart Actions
  const handleAddToCart = async (
    product: ProductCardData,
    quantity: number = 1,
    isUpsell: boolean = false,
    openDrawer: boolean = true
  ) => {
    if (product.stockQuantity <= 0) {
      const restockMsg = `"${product.name}" is currently sold out. We will restock this item soon — please check back in a few days!`;
      setStockNotice(restockMsg);
      setTimeout(() => setStockNotice(null), 6000);
      if (activeMode === 'chat') {
        const botNotice: ChatMessage = {
          id: `soldout_${Date.now()}`,
          role: 'assistant',
          content: `I'm sorry, **${product.name}** is currently sold out. Our team will restock it soon — please check back in a few days! Can I help you find an alternative?`,
        };
        setMessages((prev) => [...prev, botNotice]);
      }
      return;
    }

    try {
      setIsCartUpdating(true);
      const res = await fetch(`/api/store/${merchantSlug}/cart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          isUpsell,
          sessionToken,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.sessionToken && data.sessionToken !== sessionToken) {
          setSessionToken(data.sessionToken);
          localStorage.setItem(`mp_session_${merchantSlug}`, data.sessionToken);
        }
        await fetchCart(data.sessionToken || sessionToken!);
        if (openDrawer) {
          setIsCartOpen(true);
        }

        if (data.upsellProposal && !isUpsell) {
          const up = data.upsellProposal;
          const botUpsellMsg: ChatMessage = {
            id: `upsell_${Date.now()}`,
            role: 'assistant',
            content: `I've added ${product.name} to your cart! Based on your gear choice, I recommend pairing it with ${up.product.name} (₹${(up.product.priceMinor / 100).toLocaleString('en-IN')}).`,
            upsellProposal: {
              product: up.product,
              reason: up.reason,
            },
          };
          setMessages((prev) => {
            const alreadyHasUpsell = prev.some((m) => m.upsellProposal?.product?.id === up.product.id);
            return alreadyHasUpsell ? prev : [...prev, botUpsellMsg];
          });
        }
      } else {
        const errData = await res.json();
        const msg = errData.error || 'Unable to add item to cart';
        setStockNotice(msg);
        setTimeout(() => setStockNotice(null), 6000);
      }
    } catch (err) {
      console.error('Add to cart failed:', err);
    } finally {
      setIsCartUpdating(false);
    }
  };

  const handleBuyNow = async (product: ProductCardData, quantity: number = 1) => {
    if (product.stockQuantity <= 0) {
      const restockMsg = `"${product.name}" is currently sold out. We will restock this item soon — please check back in a few days!`;
      setStockNotice(restockMsg);
      setTimeout(() => setStockNotice(null), 6000);
      return;
    }
    await handleAddToCart(product, quantity);
    setIsCartOpen(false);
    setCheckoutError(null);
    setIsCheckoutModalOpen(true);
  };

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (!sessionToken) return;
    try {
      setIsCartUpdating(true);
      const res = await fetch(`/api/store/${merchantSlug}/cart/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: newQuantity,
          sessionToken,
        }),
      });
      if (res.ok) {
        await fetchCart(sessionToken);
      }
    } catch (err) {
      console.error('Update quantity failed:', err);
    } finally {
      setIsCartUpdating(false);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!sessionToken) return;
    try {
      setIsCartUpdating(true);
      const res = await fetch(`/api/store/${merchantSlug}/cart/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          sessionToken,
        }),
      });
      if (res.ok) {
        await fetchCart(sessionToken);
      }
    } catch (err) {
      console.error('Remove item failed:', err);
    } finally {
      setIsCartUpdating(false);
    }
  };

  // 4. Bounded Upsell Actions
  const handleAcceptUpsell = async (product: ProductCardData) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.upsellProposal && msg.upsellProposal.product.id === product.id) {
          return {
            ...msg,
            upsellProposal: { ...msg.upsellProposal, accepted: true },
          };
        }
        return msg;
      })
    );

    await handleAddToCart(product, 1, true);
  };

  const handleRejectUpsell = (productId?: string) => {
    if (productId) {
      setDismissedUpsellIds((prev) => new Set(prev).add(productId));
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.upsellProposal && msg.upsellProposal.product.id === productId) {
            return {
              ...msg,
              upsellProposal: { ...msg.upsellProposal, rejected: true },
            };
          }
          return msg;
        })
      );
      if (cartUpsellProposal?.product?.id === productId) {
        setCartUpsellProposal(null);
      }
    } else {
      setCartUpsellProposal(null);
    }
  };

  // 5. Checkout & Razorpay Flow with In-App Recovery
  const handleOpenCheckoutModal = () => {
    setIsCartOpen(false);
    setCheckoutError(null);
    setIsCheckoutModalOpen(true);
  };

  const triggerRazorpayCheckout = async (isRetry: boolean = false) => {
    if (!sessionToken) return;

    try {
      if (isRetry) {
        setIsRetryingPayment(true);
      } else {
        setIsCheckoutProcessing(true);
      }
      setCheckoutError(null);

      // Step 1: Request checkout initiation & server-side policy check
      const checkoutRes = await fetch(`/api/store/${merchantSlug}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionToken,
          isConfirmedByCustomer: true,
        }),
      });

      if (!checkoutRes.ok) {
        const errData = await checkoutRes.json();
        const msg = errData.error || 'Checkout initiation was rejected by policy.';
        setCheckoutError(msg);
        setIsCheckoutProcessing(false);
        setIsRetryingPayment(false);

        // If product is out of stock or cart invalid, show expired state
        if (msg.toLowerCase().includes('available') || msg.toLowerCase().includes('stock')) {
          setIsCheckoutModalOpen(false);
          setRecoveryModalState({
            isOpen: true,
            type: 'EXPIRED',
            failureReason: msg,
            retryCount: 0,
          });
        }
        return;
      }

      const checkoutData = await checkoutRes.json();

      // Step 2: Initialize Razorpay Checkout
      if (typeof window.Razorpay === 'undefined') {
        await verifyPayment(checkoutData.orderId, `pay_sim_${Date.now()}`);
        return;
      }

      const options = {
        key: checkoutData.keyId,
        amount: checkoutData.amountMinor,
        currency: checkoutData.currency || 'INR',
        name: merchant?.name || 'Apex Performance Gear',
        description: `Order ${checkoutData.receipt}`,
        order_id: checkoutData.razorpayOrderId,
        handler: async function (response: any) {
          await verifyPayment(
            checkoutData.orderId,
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature
          );
        },
        modal: {
          ondismiss: function () {
            setIsCheckoutProcessing(false);
            setIsRetryingPayment(false);
            setIsCheckoutModalOpen(false);
            // Present calm, reassuring in-app payment recovery popup
            setRecoveryModalState((prev) => ({
              isOpen: true,
              type: 'CANCELLED',
              failureReason: null,
              retryCount: prev.retryCount,
            }));
          },
        },
        prefill: {
          name: 'Demo Customer',
          email: 'customer@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#E11D48',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Razorpay payment failed:', response.error);
        setIsCheckoutProcessing(false);
        setIsRetryingPayment(false);
        setIsCheckoutModalOpen(false);

        // Present calm, reassuring in-app payment recovery popup
        setRecoveryModalState((prev) => ({
          isOpen: true,
          type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
          failureReason: response.error?.description || 'Declined by bank',
          retryCount: prev.retryCount + 1,
        }));
      });

      rzp.open();
    } catch (err: any) {
      console.error('Checkout error:', err);
      setIsCheckoutProcessing(false);
      setIsRetryingPayment(false);
      setIsCheckoutModalOpen(false);
      setRecoveryModalState((prev) => ({
        isOpen: true,
        type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
        failureReason: 'Connection issue. Your cart is preserved and ready.',
        retryCount: prev.retryCount + 1,
      }));
    }
  };

  const handleConfirmAndPay = async () => {
    await triggerRazorpayCheckout(false);
  };

  const handleRetryPayment = async () => {
    await triggerRazorpayCheckout(true);
  };

  // Step 3: Server-side payment verification
  const verifyPayment = async (
    orderId: string,
    paymentId: string,
    razorpayOrderId?: string,
    signature?: string
  ) => {
    try {
      const verifyRes = await fetch(`/api/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.success) {
        setCompletedOrder({
          orderId: verifyData.orderId,
          receipt: verifyData.receipt,
          amountMinor: verifyData.amountMinor,
          hasUpsellItem: verifyData.hasUpsellItem,
          paymentId,
        });
        setIsCheckoutModalOpen(false);
        setRecoveryModalState((prev) => ({ ...prev, isOpen: false }));
        setCartItems([]);
        setCartTotalMinor(0);
      } else {
        setIsCheckoutModalOpen(false);
        setRecoveryModalState((prev) => ({
          isOpen: true,
          type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
          failureReason: verifyData.error || 'Payment signature verification failed.',
          retryCount: prev.retryCount + 1,
        }));
      }
    } catch (err) {
      console.error('Verification error:', err);
      setIsCheckoutModalOpen(false);
      setRecoveryModalState((prev) => ({
        isOpen: true,
        type: prev.retryCount > 0 ? 'RETRY_FAILED' : 'FAILED',
        failureReason: 'Verification check timed out. Your order is safe.',
        retryCount: prev.retryCount + 1,
      }));
    } finally {
      setIsCheckoutProcessing(false);
      setIsRetryingPayment(false);
    }
  };

  const handleSwitchToChat = (prompt?: string) => {
    setActiveMode('chat');
    if (prompt) {
      setTimeout(() => handleSendMessage(prompt), 100);
    }
  };

  const formatCurrency = (minor: number) => `₹${(minor / 100).toLocaleString('en-IN')}`;

  // Quick catalog sorted so in-stock items appear first, followed by out-of-stock items
  const sortedQuickCatalog = useMemo(() => {
    return [...catalogProducts].sort((a, b) => {
      const aInStock = a.stockQuantity > 0 ? 1 : 0;
      const bInStock = b.stockQuantity > 0 ? 1 : 0;
      return bInStock - aInStock;
    });
  }, [catalogProducts]);

  return (
    <div className="min-h-screen bg-[var(--sf-bg)] text-[var(--sf-text-primary)] flex flex-col">
      {/* Unified Header with Chat / Shop Switcher */}
      <StoreHeader
        merchantName={merchant?.name || 'Apex Performance Gear'}
        merchantSlug={merchantSlug}
        cartItemCount={cartItems.reduce((acc, it) => acc + it.quantity, 0)}
        onOpenCart={() => setIsCartOpen(true)}
        activeMode={activeMode}
        onModeChange={setActiveMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-screen-xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col">
        {/* Sold Out Restock Notice Banner */}
        {stockNotice && (
          <div className="mb-4 p-3.5 rounded-sf bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{stockNotice}</span>
            </div>
            <button
              onClick={() => setStockNotice(null)}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-900 p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/40 sf-transition"
              aria-label="Dismiss notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Order Completed Screen */}
        {completedOrder ? (
          <div className="my-auto max-w-lg mx-auto w-full p-8 bg-[var(--sf-surface)] rounded-sf-lg border border-[var(--sf-border)] shadow-sf text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <span className="text-label text-emerald-700 dark:text-emerald-400 font-semibold inline-block mb-1">
              Payment Verified & Settled
            </span>

            <h2 className="text-xl font-bold text-[var(--sf-text-primary)] tracking-tight">
              Order Confirmed
            </h2>

            <p className="mt-1 text-xs text-[var(--sf-text-muted)]">
              Transaction verified server-side and recorded in the audit ledger.
            </p>

            <div className="mt-6 p-4 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] text-left text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--sf-text-muted)]">Internal Order ID:</span>
                <span className="font-semibold text-[var(--sf-text-primary)]">{completedOrder.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--sf-text-muted)]">Receipt No:</span>
                <span className="font-semibold text-[var(--sf-text-primary)]">{completedOrder.receipt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--sf-text-muted)]">Payment ID:</span>
                <span className="font-semibold text-[var(--sf-text-primary)]">{completedOrder.paymentId}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-[var(--sf-border)] font-sans font-bold">
                <span className="text-[var(--sf-text-primary)]">Total Settled:</span>
                <span className="text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(completedOrder.amountMinor)}
                </span>
              </div>
              {completedOrder.hasUpsellItem && (
                <div className="mt-2 text-[11px] font-sans text-stone-600 dark:text-stone-400 text-center">
                  Includes AI-recommended complementary upsell item
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  setCompletedOrder(null);
                  handleClearChat();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-sf bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs shadow-sm sf-transition"
              >
                Start New Session
              </button>
              <a
                href="/merchant/dashboard"
                className="w-full sm:w-auto px-5 py-2.5 rounded-sf border border-[var(--sf-border)] text-[var(--sf-text-secondary)] hover:bg-[var(--sf-surface-hover)] font-medium text-xs sf-transition"
              >
                Merchant Dashboard
              </a>
            </div>
          </div>
        ) : activeMode === 'shop' ? (
          /* Normal E-Commerce Catalog Browsing View */
          <ShopView
            products={catalogProducts}
            isLoading={isLoadingCatalog}
            onAddToCart={(p, q) => handleAddToCart(p, q || 1)}
            onBuyNow={(p, q) => handleBuyNow(p, q || 1)}
            onSwitchToChat={handleSwitchToChat}
            cartQuantities={cartQuantities}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        ) : (
          /* AI Sales Agent Conversational Experience */
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-[580px] lg:h-[calc(100vh-140px)] max-h-[860px]">
            {/* Left/Main Column: AI Sales Agent Conversational Experience */}
            <div className="flex-1 flex flex-col min-h-0">
              <ChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                onAddToCart={(p) => handleAddToCart(p, 1, false, false)}
                onAcceptUpsell={(p) => handleAddToCart(p, 1, true, false)}
                onRejectUpsell={handleRejectUpsell}
                isLoading={isAiLoading}
                onOpenCart={() => setIsCartOpen(true)}
                onClearChat={handleClearChat}
                cartQuantities={cartQuantities}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
              />
            </div>

            {/* Right Column: Authoritative Catalog Quick Preview */}
            <div className="w-full lg:w-80 flex flex-col min-h-0 bg-[var(--sf-surface)] rounded-sf-lg border border-[var(--sf-border)] p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--sf-border)] mb-3">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-[var(--sf-text-primary)]" />
                  <h3 className="font-semibold text-xs text-[var(--sf-text-primary)]">Catalog Quick Pick</h3>
                </div>
                <button
                  onClick={() => setActiveMode('shop')}
                  className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  View All ({catalogProducts.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {isLoadingCatalog ? (
                  <div className="h-40 flex flex-col items-center justify-center text-xs text-[var(--sf-text-muted)]">
                    <Loader2 className="w-4 h-4 animate-spin mb-1" />
                    <span>Loading inventory...</span>
                  </div>
                ) : sortedQuickCatalog.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-[var(--sf-text-muted)]">
                    No products found.
                  </div>
                ) : (
                  sortedQuickCatalog.map((p) => {
                    const isOutOfStock = p.stockQuantity <= 0;
                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 rounded-sf border sf-transition flex gap-2.5 relative group ${
                          isOutOfStock
                            ? 'border-dashed border-stone-200/90 dark:border-stone-800 bg-stone-50/40 dark:bg-stone-900/30 opacity-75 hover:opacity-95'
                            : 'border-[var(--sf-border)] hover:border-[var(--sf-border-hover)] bg-[var(--sf-bg-alt)] hover:bg-[var(--sf-surface-hover)]'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-sf bg-[var(--sf-surface)] overflow-hidden shrink-0 border border-[var(--sf-border)] flex items-center justify-center text-[10px] text-[var(--sf-text-muted)] relative">
                          {p.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className={`w-full h-full object-cover sf-transition ${
                                isOutOfStock ? 'grayscale opacity-65 contrast-90 group-hover:grayscale-0 group-hover:opacity-90' : ''
                              }`}
                            />
                          ) : (
                            <span>Item</span>
                          )}
                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-[0.5px] flex items-center justify-center">
                              <span className="text-[8px] font-bold text-white uppercase tracking-wider bg-black/75 px-1 py-0.5 rounded leading-none">
                                Out
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4
                              className={`text-xs font-medium truncate ${
                                isOutOfStock
                                  ? 'text-[var(--sf-text-secondary)] dark:text-stone-400'
                                  : 'text-[var(--sf-text-primary)]'
                              }`}
                              title={p.name}
                            >
                              {p.name}
                            </h4>
                            <span className="text-[11px] text-[var(--sf-text-muted)] tabular-nums">
                              {formatCurrency(p.priceMinor)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            {isOutOfStock ? (
                              <>
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                  <span>Sold out</span>
                                </span>
                                <button
                                  onClick={() => {
                                    handleSendMessage(`Is "${p.name}" going to be restocked soon, or do you have a similar alternative in stock?`);
                                  }}
                                  className="text-[10.5px] font-medium text-[var(--sf-text-muted)] hover:text-brand-600 dark:hover:text-rose-400 hover:underline sf-transition cursor-pointer"
                                  title="Ask AI in chat about restock or alternatives"
                                >
                                  Ask AI
                                </button>
                              </>
                            ) : cartQuantities[p.id] && cartQuantities[p.id] > 0 ? (
                              <div className="flex items-center justify-between w-full animate-fade-in">
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                  Added
                                </span>
                                <div className="flex items-center rounded-sf border border-emerald-500/40 dark:border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/50 shadow-xs overflow-hidden sf-transition">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = cartQuantities[p.id];
                                      if (cur <= 1) {
                                        handleRemoveItem(p.id);
                                      } else {
                                        handleUpdateQuantity(p.id, cur - 1);
                                      }
                                    }}
                                    disabled={isCartUpdating}
                                    className="px-1.5 py-0.5 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition cursor-pointer disabled:opacity-40"
                                    title={cartQuantities[p.id] === 1 ? 'Remove from cart' : 'Decrease quantity'}
                                  >
                                    {cartQuantities[p.id] === 1 ? (
                                      <Trash2 className="w-2.5 h-2.5 text-rose-500" />
                                    ) : (
                                      <Minus className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 border-x border-emerald-300/40 dark:border-emerald-800/40 select-none">
                                    {cartQuantities[p.id]}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const cur = cartQuantities[p.id];
                                      if (cur < p.stockQuantity) {
                                        handleUpdateQuantity(p.id, cur + 1);
                                      }
                                    }}
                                    disabled={isCartUpdating || cartQuantities[p.id] >= p.stockQuantity}
                                    className="px-1.5 py-0.5 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition disabled:opacity-30 cursor-pointer"
                                    title={cartQuantities[p.id] >= p.stockQuantity ? 'Max stock reached' : 'Increase quantity'}
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-[10px] text-[var(--sf-text-muted)]">
                                  {p.stockQuantity} in stock
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAddToCart(p, 1, false, false)}
                                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 dark:text-rose-400 dark:hover:text-rose-300 sf-transition cursor-pointer"
                                >
                                  + Add
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2.5 border-t border-[var(--sf-border)] text-[10px] text-[var(--sf-text-muted)] flex items-center justify-between">
                <span>PostgreSQL Catalog</span>
                <button
                  onClick={() => setActiveMode('shop')}
                  className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
                >
                  Browse Store →
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Cart Drawer (Shared by both Chat & Shop) */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        totalMinor={cartTotalMinor}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onProceedToCheckout={handleOpenCheckoutModal}
        isLoading={isCartUpdating}
        upsellProposal={cartUpsellProposal}
        onAddUpsell={(prod) => handleAddToCart(prod, 1, true)}
        onSkipUpsell={() => handleRejectUpsell(cartUpsellProposal?.product?.id)}
      />

      {/* Explicit Customer Confirmation & Razorpay Modal (Shared by both Chat & Shop) */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        items={cartItems}
        totalMinor={cartTotalMinor}
        merchantName={merchant?.name || 'Apex Performance Gear'}
        onConfirmAndPay={handleConfirmAndPay}
        isProcessing={isCheckoutProcessing}
        errorMessage={checkoutError}
      />

      {/* In-App Payment Recovery Modal */}
      <PaymentRecoveryModal
        isOpen={recoveryModalState.isOpen}
        onClose={() => setRecoveryModalState((prev) => ({ ...prev, isOpen: false }))}
        type={recoveryModalState.type}
        items={cartItems}
        totalMinor={cartTotalMinor}
        onRetry={handleRetryPayment}
        isRetrying={isRetryingPayment}
        failureReason={recoveryModalState.failureReason}
      />
    </div>
  );
}
