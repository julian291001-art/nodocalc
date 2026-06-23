import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jte|ttf|woff2?|png|jpg|jpeg|gif|svg|ico|webp)).*)", "/(api|trpc)(.*)"],
};
