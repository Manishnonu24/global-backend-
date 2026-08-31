import NextAuth from "next-auth";
import { frontendAuthOptions } from "@/lib/frontendAuth";

const handler = NextAuth(frontendAuthOptions);

export { handler as GET, handler as POST };
