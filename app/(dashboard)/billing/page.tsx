'use client';

import { useEffect, useState } from "react";
import { 
  Check, 
  Loader2, 
  Copy, 
  CheckCircle2, 
  Clock, 
  RotateCw,
  Coins,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "@/lib/api";

interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: string;
  reason: string;
  reference_id?: string;
  idempotency_key: string;
  created_at: string;
}

export default function BillingPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPkg, setLoadingPkg] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notifyBalanceChange = (newBal: number) => {
    setBalance(newBal);
    if (typeof window !== "undefined") {
      try {
        const current = JSON.parse(localStorage.getItem("sonic_user") || "{}");
        localStorage.setItem("sonic_user", JSON.stringify({ ...current, balance_credits: newBal }));
      } catch (e) {}
      window.dispatchEvent(new CustomEvent("sonic_balance_updated", { detail: newBal }));
    }
  };

  const fetchBalanceAndHistory = async () => {
    try {
      // 1. Fetch live balance
      const authRes = await apiFetch<any>("/auth/me");
      if (authRes.success && authRes.data) {
        notifyBalanceChange(authRes.data.balance_credits ?? 0);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setLoading(false);
    }

    try {
      // 2. Fetch transaction history
      setLoadingHistory(true);
      const histRes = await apiFetch<any>("/billing/transactions");
      if (histRes.success && histRes.data) {
        setTransactions(histRes.data.transactions || []);
        if (histRes.data.balance !== undefined) {
          notifyBalanceChange(histRes.data.balance);
        }
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    // 1. Load initial cached balance
    const cached = localStorage.getItem("sonic_user");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.balance_credits !== undefined) {
          setBalance(parsed.balance_credits);
        }
      } catch (e) {}
    }

    fetchBalanceAndHistory();

    // 2. Check for Paystack redirect callback
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("reference");
      if (ref) {
        setVerifyingPayment(true);
        apiFetch<any>("/billing/paystack/verify", {
          method: "POST",
          body: JSON.stringify({ reference: ref }),
        })
          .then((res) => {
            if (res.success && res.data) {
              notifyBalanceChange(res.data.balance);
              setNotification({
                type: 'success',
                message: `Payment confirmed! ${res.data.credits.toLocaleString()} credits have been added to your account.`
              });
              fetchBalanceAndHistory();
            } else {
              setNotification({
                type: 'error',
                message: res.error || "Unable to confirm payment with Paystack."
              });
            }
          })
          .catch(() => {
            setNotification({
              type: 'error',
              message: "Network error while confirming payment."
            });
          })
          .finally(() => {
            setVerifyingPayment(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          });
      }
    }
  }, []);

  const handlePurchase = async (packageId: string) => {
    setLoadingPkg(packageId);
    setNotification(null);
    try {
      const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/billing` : undefined;
      const res = await apiFetch<any>("/billing/paystack/initialize", {
        method: "POST",
        body: JSON.stringify({
          package_id: packageId,
          callback_url: callbackUrl,
        }),
      });

      if (res.success && res.data?.authorization_url) {
        window.location.href = res.data.authorization_url;
      } else {
        setNotification({
          type: 'error',
          message: res.error || "Could not start payment checkout."
        });
        setLoadingPkg(null);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || "An unexpected error occurred."
      });
      setLoadingPkg(null);
    }
  };

  const handleCopyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Plain-English, human translation for technical raw reasons
  const cleanDescription = (reason: string, type: string) => {
    if (!reason) return "Account Activity";
    if (reason.includes("Groq Whisper") || reason.includes("STT")) {
      return "Audio Transcription";
    }
    if (reason.includes("Welcome Bonus")) {
      return "Welcome Gift";
    }
    return reason;
  };

  const packages = [
    {
      id: "pkg_creator",
      name: "Starter Pack",
      credits: 500,
      hours: "~10 hours of audio",
      price: "₦15,000",
      description: "For creators, freelancers, and occasional meeting notes.",
      popular: false,
      features: [
        "500 minutes of transcription",
        "Speaker names & exact timestamps",
        "Summaries & social media posts",
        "Export to PDF and Word",
        "Credits never expire",
      ],
    },
    {
      id: "pkg_pro",
      name: "Pro Studio",
      credits: 2000,
      hours: "~40 hours of audio",
      price: "₦40,000",
      description: "Best for consultants, podcasters, and weekly meetings.",
      popular: true,
      features: [
        "2,000 minutes of transcription",
        "Everything in Starter Pack",
        "Priority fast processing",
        "Short video clip maker (coming soon)",
        "Credits never expire",
      ],
    },
    {
      id: "pkg_studio",
      name: "Scale Pack",
      credits: 10000,
      hours: "~200 hours of audio",
      price: "₦150,000",
      description: "For agencies and teams with high weekly volume.",
      popular: false,
      features: [
        "10,000 minutes of transcription",
        "Everything in Pro Studio",
        "Fastest processing speed",
        "Dedicated priority support",
        "Credits never expire",
      ],
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Page Header (Resend clean style) */}
      <div className="border-b border-white/[0.08] pb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">Billing</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your credit balance and view past receipts.
        </p>
      </div>

      {/* Payment Verification Banner */}
      {verifyingPayment && (
        <div className="p-4 rounded-xl border border-[#00D4B4]/30 bg-[#00D4B4]/5 text-white flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[#00D4B4] shrink-0" />
          <div className="text-xs">
            <span className="font-medium text-[#00D4B4]">Confirming payment...</span>
            <span className="text-zinc-400 ml-2">Updating your balance.</span>
          </div>
        </div>
      )}

      {/* Payment Feedback Banner */}
      {notification && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs ${
          notification.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/30 bg-red-500/10 text-red-300'
        }`}>
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-zinc-400 hover:text-white px-2 py-0.5 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Balance Card (Resend Minimalist Overview) */}
      <div className="rounded-xl border border-white/[0.08] bg-zinc-950 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Available Balance</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              {balance !== null ? balance.toLocaleString() : "..."}
            </span>
            <span className="text-sm text-zinc-400 font-normal">credits</span>
          </div>
          <p className="text-xs text-zinc-500 pt-0.5">
            1 credit = 1 minute of audio or video transcription
          </p>
        </div>

        <div className="flex flex-col sm:items-end gap-1.5 text-xs text-zinc-400">
          <span className="inline-flex items-center gap-1.5 text-zinc-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-[#00D4B4]" /> Pay as you go
          </span>
          <span className="text-[11px] text-zinc-500">Credits never expire &bull; No monthly subscription</span>
        </div>
      </div>

      {/* Add Credits Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">Add Credits</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Top up whenever you need. Payments are processed securely with Paystack.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {packages.map((pkg) => {
            const isBuying = loadingPkg === pkg.id;
            return (
              <div
                key={pkg.id}
                className={`rounded-xl p-6 flex flex-col justify-between relative transition ${
                  pkg.popular
                    ? 'border border-[#00D4B4]/60 bg-zinc-950 shadow-lg shadow-[#00D4B4]/5'
                    : 'border border-white/[0.08] bg-zinc-950 hover:border-white/20'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 right-4 bg-[#00D4B4] text-[#0D0D0D] text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    Popular
                  </span>
                )}

                <div>
                  <h3 className="text-base font-semibold text-white">{pkg.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1 min-h-[32px]">{pkg.description}</p>

                  <div className="mt-5 pb-5 border-b border-white/[0.06]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-bold text-white">{pkg.price}</span>
                      <span className="text-xs text-zinc-500">one-time</span>
                    </div>
                    <div className="text-xs text-[#00D4B4] font-medium mt-1">
                      +{pkg.credits.toLocaleString()} credits ({pkg.hours})
                    </div>
                  </div>

                  <ul className="mt-5 space-y-2.5 text-xs text-zinc-300">
                    {pkg.features.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Check className="w-3.5 h-3.5 text-[#00D4B4] shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loadingPkg !== null}
                  className={`mt-8 w-full py-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    pkg.popular
                      ? 'bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D]'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]`}
                >
                  {isBuying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Redirecting to Paystack...</span>
                    </>
                  ) : (
                    <>
                      <span>Buy {pkg.name}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History (Resend Clean Invoices/Receipts Style) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Transaction History</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Past purchases and transcription activity.</p>
          </div>
          <button
            onClick={fetchBalanceAndHistory}
            disabled={loadingHistory}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-md border border-white/10 hover:bg-white/5 transition disabled:opacity-50"
            title="Refresh transactions"
          >
            <RotateCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-zinc-950 overflow-hidden">
          {loadingHistory ? (
            <div className="p-12 flex flex-col items-center justify-center text-zinc-400 space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#00D4B4]" />
              <p className="text-xs">Loading transactions...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-1">
              <p className="text-xs font-medium text-zinc-400">No transactions yet</p>
              <p className="text-[11px] text-zinc-500">When you buy credits or transcribe files, they will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-400 bg-white/[0.02]">
                    <th className="py-3 px-4 font-normal">Date</th>
                    <th className="py-3 px-4 font-normal">Description</th>
                    <th className="py-3 px-4 font-normal">Type</th>
                    <th className="py-3 px-4 font-normal text-right">Credits</th>
                    <th className="py-3 px-4 font-normal hidden md:table-cell">Reference</th>
                    <th className="py-3 px-4 text-right font-normal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs text-zinc-300">
                  {transactions.map((tx) => {
                    const isCredit = tx.amount > 0;
                    const dateFormatted = new Date(tx.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });

                    return (
                      <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                        {/* Date */}
                        <td className="py-3 px-4 text-zinc-400 whitespace-nowrap font-mono text-[11px]">
                          {dateFormatted}
                        </td>

                        {/* Clean Description */}
                        <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                          {cleanDescription(tx.reason, tx.type)}
                        </td>

                        {/* Simple Type */}
                        <td className="py-3 px-4 whitespace-nowrap text-[11px] text-zinc-400">
                          {tx.type === "purchase" ? (
                            <span className="text-emerald-400">Purchase</span>
                          ) : tx.type === "grant" || tx.type === "bonus" ? (
                            <span className="text-purple-400">Gift</span>
                          ) : (
                            <span className="text-zinc-400">Usage</span>
                          )}
                        </td>

                        {/* Credits Amount */}
                        <td className={`py-3 px-4 text-right font-mono font-medium whitespace-nowrap ${
                          isCredit ? 'text-emerald-400' : 'text-zinc-400'
                        }`}>
                          {isCredit ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()}
                        </td>

                        {/* Clean Reference */}
                        <td className="py-3 px-4 hidden md:table-cell whitespace-nowrap">
                          {tx.reference_id ? (
                            <button
                              onClick={() => handleCopyRef(tx.reference_id!)}
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-zinc-400 hover:text-white bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06] transition"
                              title="Copy reference code"
                            >
                              <span>{tx.reference_id.slice(0, 14)}...</span>
                              {copiedRef === tx.reference_id ? (
                                <Check className="w-3 h-3 text-[#00D4B4]" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-60" />
                              )}
                            </button>
                          ) : (
                            <span className="text-zinc-600 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-right whitespace-nowrap text-[11px]">
                          <span className="inline-flex items-center gap-1 text-zinc-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Completed
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
