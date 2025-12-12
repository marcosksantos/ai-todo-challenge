// AI Todo Copilot - WhatsAppButton Component
// Floating button to connect WhatsApp and save phone number to user profile

"use client";

import { useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"

/**
 * WhatsAppButton component that allows users to connect their WhatsApp account.
 * Saves phone number to user profile and opens WhatsApp Web.
 */
export default function WhatsAppButton() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    };
    getUser();
  }, [supabase]);

  const handleSaveAndChat = async () => {
    if (!phone.trim()) {
      alert("Please enter a phone number");
      return;
    }

    if (!user) {
      alert("User not authenticated");
      return;
    }

    setIsLoading(true);
    setSuccessMessage("");

    try {
      // Step 1: Update profiles table with phone number
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            phone: phone.trim(),
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "id",
          }
        );

      if (updateError) {
        // If profiles table doesn't exist or has different structure, try insert first
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            phone: phone.trim(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error saving phone:", insertError)
          alert(`Error saving phone number: ${insertError.message}`)
          setIsLoading(false)
          return
        }
      }

      // Step 2: Redirect to WhatsApp
      const whatsappUrl = "https://wa.me/5522992737876?text=Hello,%20I%20came%20from%20the%20app!";
      window.open(whatsappUrl, "_blank");

      // Step 3: Show success message and close modal
      setSuccessMessage("Phone number saved successfully! Opening WhatsApp...");
      setTimeout(() => {
        setIsModalOpen(false);
        setSuccessMessage("");
        setPhone("");
      }, 1500)
    } catch (error) {
      console.error("Error saving phone number:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save phone number"
      alert(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-6 h-14 w-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg z-50 flex items-center justify-center text-white hover:scale-105 transition-all duration-200 group"
        aria-label="Connect WhatsApp"
        title="Connect WhatsApp"
      >
        {/* WhatsApp Icon SVG */}
        <svg
          className="w-7 h-7"
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </button>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <h2 className="text-xl font-semibold text-white mb-6 pr-8">
              Connect your WhatsApp
            </h2>

            {/* Success Message */}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/50 rounded-lg text-green-400 text-sm">
                {successMessage}
              </div>
            )}

            {/* Phone Input */}
            <div className="space-y-2 mb-6">
              <label
                htmlFor="phone-input"
                className="block text-sm font-medium text-slate-300"
              >
                Phone Number
              </label>
              <input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511999998888"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading) {
                    handleSaveAndChat();
                  }
                }}
              />
              <p className="text-xs text-slate-500">
                Example: 5511999998888 (country code + number, no spaces)
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleSaveAndChat}
              disabled={isLoading || !phone.trim()}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save & Chat</span>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

