import { Metadata } from "next"

export default function RegisterLayout({
	children,
}: {
	children: React.ReactNode
}) {
	return <div>{children}</div>
}

export const metadata: Metadata = {
	title: "Create account · Cortex",
	description:
    "Create a Cortex account and embed an AI assistant on your website, powered by your own documents.",
}
