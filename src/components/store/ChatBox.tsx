'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Check, ArrowRight, ShoppingCart, Loader2, RotateCcw, Plus, Minus, Trash2 } from 'lucide-react';
import { ProductCard, ProductCardData } from './ProductCard';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  recommendations?: ProductCardData[];
  upsellProposal?: {
    product: ProductCardData;
    reason: string;
    accepted?: boolean;
    rejected?: boolean;
  };
  createdAt?: string;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<void>;
  onAddToCart: (product: ProductCardData) => void;
  onAcceptUpsell: (product: ProductCardData) => void;
  onRejectUpsell: (productId: string) => void;
  isLoading: boolean;
  onOpenCart: () => void;
  onClearChat?: () => void;
  cartQuantities?: Record<string, number>;
  onUpdateQuantity?: (productId: string, quantity: number) => void;
  onRemoveItem?: (productId: string) => void;
}

const PROMPT_SUGGESTIONS = [
  'I need running shoes under ₹4,000 for daily jogging.',
  'Show me lightweight shoes for marathon training.',
  'What accessories or socks do you recommend?',
  'I want gym shoes that work for daily running.',
];

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  onSendMessage,
  onAddToCart,
  onAcceptUpsell,
  onRejectUpsell,
  isLoading,
  onOpenCart,
  onClearChat,
  cartQuantities = {},
  onUpdateQuantity,
  onRemoveItem,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput('');
    await onSendMessage(text);
  };

  const handleChipClick = async (promptText: string) => {
    if (isLoading) return;
    await onSendMessage(promptText);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--sf-surface)] rounded-sf-lg border border-[var(--sf-border)] overflow-hidden">
      {/* Active Conversation Sub-header */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--sf-border)] bg-[var(--sf-bg-alt)]/50 text-xs">
          <div className="flex items-center gap-1.5 text-[var(--sf-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-medium text-[var(--sf-text-secondary)]">Session Preserved</span>
          </div>
          {onClearChat && (
            <button
              onClick={onClearChat}
              className="text-[11px] text-[var(--sf-text-muted)] hover:text-brand-600 dark:hover:text-rose-400 flex items-center gap-1 sf-transition px-1.5 py-0.5 rounded hover:bg-[var(--sf-surface-hover)] font-medium"
              title="Start a new conversation"
            >
              <RotateCcw className="w-3 h-3" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Welcome greeting if no messages */}
        {messages.length === 0 && (
          <div className="min-h-full flex flex-col items-center justify-center text-center p-4 sm:p-6 max-w-md mx-auto py-8">
            <div className="relative group mb-4">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 opacity-35 dark:opacity-50 blur-sm group-hover:opacity-75 transition duration-700 animate-pulse" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 via-brand-600 to-rose-700 dark:from-rose-500 dark:via-red-600 dark:to-rose-800 shadow-md shadow-brand-500/25 dark:shadow-[0_0_24px_rgba(244,63,94,0.45)] dark:border dark:border-rose-400/40 flex items-center justify-center text-white font-bold text-sm">
                SF
              </div>
            </div>
            <h2 className="text-xl font-bold text-[var(--sf-text-primary)] tracking-tight">
              SellFlow Assistant
            </h2>
            <p className="mt-1.5 text-xs text-[var(--sf-text-muted)] leading-relaxed max-w-sm">
              I query our real catalog in PostgreSQL, provide grounded recommendations, and guide you through a safe checkout.
            </p>

            <div className="mt-6 w-full text-left">
              <span className="text-label block mb-2 text-brand-600 dark:text-rose-400 font-semibold">
                Sample Prompts
              </span>
              <div className="flex flex-col gap-1.5">
                {PROMPT_SUGGESTIONS.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChipClick(chip)}
                    className="w-full text-left p-2.5 rounded-sf bg-[var(--sf-bg-alt)] hover:bg-brand-50/50 dark:hover:bg-rose-950/20 border border-[var(--sf-border)] dark:border-stone-800 hover:border-brand-400/50 dark:hover:border-rose-500/40 text-xs text-[var(--sf-text-secondary)] dark:text-stone-300 hover:text-brand-600 dark:hover:text-rose-300 font-medium sf-transition flex items-center justify-between group shadow-xs"
                  >
                    <span>{chip}</span>
                    <ArrowRight className="w-3 h-3 text-[var(--sf-text-muted)] group-hover:text-brand-600 dark:group-hover:text-rose-300 group-hover:translate-x-0.5 sf-transition" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-start gap-2 max-w-2xl">
              <div
                className={`p-3.5 rounded-sf text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                  msg.role === 'user'
                    ? 'bg-[var(--sf-text-primary)] text-[var(--sf-bg)] font-medium'
                    : 'bg-[var(--sf-bg-alt)] text-[var(--sf-text-primary)] border border-[var(--sf-border)] dark:border-stone-800 border-l-2 border-l-brand-500/60 dark:border-l-rose-500/70 pl-3.5'
                }`}
              >
                {msg.content}
              </div>
            </div>

            {/* Product Recommendations Grid if attached to message */}
            {msg.recommendations && msg.recommendations.length > 0 && (
              <div className="mt-3 w-full">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {msg.recommendations.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      cartQuantity={cartQuantities[prod.id] || 0}
                      onAddToCart={(p) => onAddToCart(p)}
                      onUpdateQuantity={onUpdateQuantity}
                      onRemoveItem={onRemoveItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Bounded Upsell Proposal Banner if attached */}
            {msg.upsellProposal && !msg.upsellProposal.rejected && (
              <div className="mt-3 w-full max-w-lg">
                <div className="p-4 rounded-sf border border-brand-200/60 dark:border-rose-900/50 bg-brand-50/40 dark:bg-rose-950/25 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-label text-brand-600 dark:text-rose-400 font-semibold">Complementary Recommendation</span>
                    <span className="font-semibold text-xs tabular-nums text-brand-600 dark:text-rose-400 font-mono">
                      +₹{(msg.upsellProposal.product.priceMinor / 100).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-sf bg-[var(--sf-bg-alt)] overflow-hidden shrink-0 border border-[var(--sf-border)]">
                      {msg.upsellProposal.product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={msg.upsellProposal.product.imageUrl}
                          alt={msg.upsellProposal.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--sf-text-muted)] text-[10px]">
                          Item
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-[var(--sf-text-primary)]">
                        Pair with {msg.upsellProposal.product.name}
                      </h4>
                      <p className="text-[11px] text-[var(--sf-text-muted)] leading-relaxed line-clamp-2">
                        {msg.upsellProposal.reason}
                      </p>
                    </div>
                  </div>

                  {(msg.upsellProposal.accepted || (cartQuantities[msg.upsellProposal.product.id] && cartQuantities[msg.upsellProposal.product.id] > 0)) ? (
                    <div className="pt-2 flex items-center gap-2 animate-fade-in">
                      <div className="flex items-center rounded-sf border border-emerald-500/40 dark:border-emerald-500/50 bg-emerald-50/90 dark:bg-emerald-950/50 shadow-xs overflow-hidden sf-transition">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = cartQuantities[msg.upsellProposal!.product.id] || 1;
                            if (cur <= 1) {
                              onRemoveItem?.(msg.upsellProposal!.product.id);
                            } else {
                              onUpdateQuantity?.(msg.upsellProposal!.product.id, cur - 1);
                            }
                          }}
                          className="px-2 py-1.5 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition flex items-center justify-center cursor-pointer"
                          title="Decrease quantity"
                        >
                          {(cartQuantities[msg.upsellProposal.product.id] || 1) <= 1 ? (
                            <Trash2 className="w-3.5 h-3.5 text-rose-500 hover:text-rose-600" />
                          ) : (
                            <Minus className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <span className="px-2.5 py-1 text-xs font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 flex items-center gap-1 border-x border-emerald-300/40 dark:border-emerald-800/40 select-none">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{cartQuantities[msg.upsellProposal.product.id] || 1} in cart</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            const cur = cartQuantities[msg.upsellProposal!.product.id] || 1;
                            onUpdateQuantity?.(msg.upsellProposal!.product.id, cur + 1);
                          }}
                          className="px-2 py-1.5 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 sf-transition flex items-center justify-center cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onAcceptUpsell(msg.upsellProposal!.product)}
                        id="accept-upsell-btn"
                        className="px-3 py-1.5 rounded-sf bg-gradient-to-r from-brand-600 to-rose-600 dark:from-rose-500 dark:to-red-600 hover:from-brand-500 hover:to-rose-500 dark:hover:from-rose-400 dark:hover:to-red-500 text-white text-xs font-semibold sf-transition flex items-center gap-1 shadow-xs shadow-brand-600/20 dark:shadow-[0_0_14px_rgba(244,63,94,0.35)] dark:border dark:border-rose-400/30 active:scale-97 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        Add {msg.upsellProposal.product.name}
                      </button>

                      <button
                        type="button"
                        onClick={() => onRejectUpsell(msg.upsellProposal!.product.id)}
                        id="reject-upsell-btn"
                        className="px-2.5 py-1.5 rounded-sf border border-[var(--sf-border)] dark:border-stone-800 text-xs text-[var(--sf-text-secondary)] dark:text-stone-300 hover:text-[var(--sf-text-primary)] hover:bg-[var(--sf-surface-hover)] dark:hover:bg-stone-800 sf-transition cursor-pointer"
                      >
                        Skip
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-brand-600 dark:text-rose-400 p-2 rounded-sf bg-brand-50/50 dark:bg-rose-950/30 border border-brand-200/40 dark:border-rose-900/40 max-w-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Consulting catalog & verifying merchant policies...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-3 bg-[var(--sf-surface)] border-t border-[var(--sf-border)] dark:border-stone-800 space-y-2">
        {/* Subtle Assistant Scope Hint */}
        <div className="px-1 text-[11px] text-[var(--sf-text-muted)] flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-brand-500/60 dark:bg-rose-400/60 shrink-0" />
          <span>Ask about products, prices, sizes, availability, or your cart.</span>
        </div>

        <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about products or your order..."
            disabled={isLoading}
            id="chat-input-field"
            className="w-full pl-3.5 pr-11 py-2.5 rounded-sf bg-[var(--sf-bg-alt)] border border-[var(--sf-border)] dark:border-stone-800 text-xs text-[var(--sf-text-primary)] placeholder:text-[var(--sf-text-muted)] focus:outline-none focus:border-brand-500 dark:focus:border-rose-500 focus:ring-1 focus:ring-brand-500/20 dark:focus:ring-rose-500/20 sf-transition shadow-inner-xs"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            id="chat-submit-button"
            aria-label="Send Message"
            className="absolute right-2 p-1.5 rounded-sf bg-gradient-to-r from-brand-600 to-rose-600 dark:from-rose-500 dark:to-red-600 hover:from-brand-500 hover:to-rose-500 dark:hover:from-rose-400 dark:hover:to-red-500 disabled:opacity-30 text-white sf-transition shadow-xs shadow-brand-600/20 dark:shadow-[0_0_14px_rgba(244,63,94,0.4)] dark:border dark:border-rose-400/30 active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-[var(--sf-text-muted)] px-1">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Deterministic policy boundaries • Razorpay Verified
          </span>
          <button
            onClick={onOpenCart}
            className="text-brand-600 dark:text-rose-400 hover:text-brand-500 dark:hover:text-rose-300 hover:underline font-medium flex items-center gap-1 sf-transition"
          >
            <ShoppingCart className="w-3 h-3" />
            <span>View Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
};
