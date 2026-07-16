"use client";
import { createAuthClient } from "better-auth/react";

/** Browser auth client (login form, session hook). baseURL defaults to origin. */
export const authClient = createAuthClient();

export const { signIn, signOut, signUp, useSession } = authClient;
