import { Metadata } from "next"
import { ReactNode } from "react"

export default async function LoginLayout({
	children,
}: {
	children: ReactNode
}) {
	return <div>{children}</div>
}

export const metadata: Metadata = {
	title: "Sign in · Cortex",
	description:
    "Sign in to Cortex to manage your website assistant, documents and sources.",
}
