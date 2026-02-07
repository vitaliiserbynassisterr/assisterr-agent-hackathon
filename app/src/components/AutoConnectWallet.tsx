"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { MockWalletName } from "@/lib/mock-wallet-adapter";

// Check test mode synchronously
const TEST_MODE = process.env.NEXT_PUBLIC_AUTH_MOCK === "true";

/**
 * Auto-connects the mock wallet in test mode
 * This component should be rendered inside WalletProvider
 */
export function AutoConnectWallet({ children }: { children: React.ReactNode }) {
  const { wallets, select, connect, connected, connecting, wallet } = useWallet();
  const attemptedRef = useRef(false);
  const connectingRef = useRef(false);

  const doConnect = useCallback(async () => {
    if (!TEST_MODE) return;
    if (connected || connecting || connectingRef.current) return;
    if (attemptedRef.current) return;

    // Find the mock wallet
    const mockWallet = wallets.find((w) => w.adapter.name === MockWalletName);
    if (!mockWallet) {
      console.log("AutoConnectWallet: Waiting for mock wallet...", wallets.map(w => w.adapter.name));
      return;
    }

    attemptedRef.current = true;
    connectingRef.current = true;

    try {
      console.log("AutoConnectWallet: Found mock wallet, selecting...");
      select(MockWalletName);

      // Wait for selection to propagate
      await new Promise((r) => setTimeout(r, 300));

      // Check if wallet is now selected
      console.log("AutoConnectWallet: Connecting...");
      await connect();
      console.log("AutoConnectWallet: Connected successfully!");
    } catch (error) {
      console.error("AutoConnectWallet: Failed to connect:", error);
      // Reset on error to allow retry
      attemptedRef.current = false;
    } finally {
      connectingRef.current = false;
    }
  }, [wallets, select, connect, connected, connecting]);

  useEffect(() => {
    // Only attempt connection when wallets are loaded and we're in test mode
    if (TEST_MODE && wallets.length > 0 && !connected && !connecting) {
      doConnect();
    }
  }, [wallets, connected, connecting, doConnect]);

  // Also try connecting when wallet is selected but not connected
  useEffect(() => {
    if (TEST_MODE && wallet && !connected && !connecting && !connectingRef.current) {
      console.log("AutoConnectWallet: Wallet selected, attempting connect...");
      connect().catch((err) => {
        console.error("AutoConnectWallet: Connect after select failed:", err);
      });
    }
  }, [wallet, connected, connecting, connect]);

  return <>{children}</>;
}
