// AI Todo Copilot - WhatsAppConnectButton Component
// Enhanced WhatsApp connection button with phone validation and sanitization

"use client";

import { useState, useEffect } from "react"
import { X, Loader2, MessageCircle } from "lucide-react"
import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"

/**
 * WhatsAppConnectButton component that allows users to connect their WhatsApp account.
 * Includes phone number validation, sanitization, and opens WhatsApp Web with pre-filled message.
 */
export default function WhatsAppConnectButton() {
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      }
    };
    getUser();
  }, [supabase]);

  /**
   * Sanitizes phone number by removing all non-numeric characters.
   * 
   * @param input - Raw phone number input
   * @returns Sanitized phone number containing only digits
   */
  const sanitizePhone = (input: string): string => {
    return input.replace(/\D/g, "");
  };

  /**
   * Validates phone number format.
   * 
   * @param phoneNumber - Phone number to validate
   * @returns True if phone number has at least 8 digits
   */
  const validatePhone = (phoneNumber: string): boolean => {
    const sanitized = sanitizePhone(phoneNumber);
    return sanitized.length >= 8;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhone(value);
    // Clear error when user starts typing
    if (error) {
      setError("");
    }
  };

  const handleSaveAndConnect = async () => {
    // Reset error
    setError("");

    // Validate input
    if (!phone.trim()) {
      setError("Please enter a valid phone number with country code");
      return;
    }

    const sanitizedPhone = sanitizePhone(phone);
    
    if (!validatePhone(sanitizedPhone)) {
      setError("Phone number must have at least 8 digits. Please include country code");
      return;
    }

    if (!user) {
      setError("User not authenticated");
      return;
    }

    setIsLoading(true);

    try {
      // Update profiles table with sanitized phone number
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            phone: sanitizedPhone,
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
            phone: sanitizedPhone,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error saving phone:", insertError)
          setError(`Failed to save phone number: ${insertError.message}`)
          setIsLoading(false)
          return
        }
      }

      // Success: Close modal and open WhatsApp
      setIsModalOpen(false);
      setPhone("");
      setError("");

      // Open WhatsApp Web with pre-filled message
      const whatsappMessage = "Hello! I connected my account. To add new tasks, I will use: #to-do list Buy coffee";
      const whatsappUrl = `https://wa.me/5522992737876?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappUrl, "_blank")
    } catch (error) {
      console.error("Error saving phone number:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save phone number"
      setError(`Error: ${errorMessage}`)
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPhone("");
    setError("");
  };

  if (!user) return null;

  const isPhoneInvalid = phone.trim() !== "" && !validatePhone(phone);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg z-50 flex items-center justify-center text-white hover:scale-105 transition-all duration-200"
        aria-label="Connect WhatsApp"
        title="Connect WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          {/* Modal Content */}
          <div
            className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <h2 className="text-xl font-semibold text-white mb-6 pr-8">
              Connect your WhatsApp
            </h2>

            {/* Phone Input */}
            <div className="space-y-2 mb-6">
              <label
                htmlFor="phone-input"
                className="block text-sm font-medium text-gray-300"
              >
                Phone Number
              </label>
              <input
                id="phone-input"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="1 (555) 123-4567"
                className={`w-full bg-gray-800 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
                  isPhoneInvalid
                    ? "border-red-500 focus:ring-red-500/50 focus:border-red-500"
                    : "border-gray-700 focus:ring-green-500/50 focus:border-green-500"
                }`}
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isLoading && !isPhoneInvalid) {
                    handleSaveAndConnect();
                  }
                }}
              />
              <p className="text-xs text-gray-500">
                Enter your number including Country Code (DDI).
              </p>
              
              {/* Error Message */}
              {error && (
                <p className="text-sm text-red-500 mt-1">{error}</p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleSaveAndConnect}
              disabled={isLoading || !phone.trim() || isPhoneInvalid}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <span>Save & Connect</span>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
