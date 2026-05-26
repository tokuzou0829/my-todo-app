import { LoaderIcon } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: ComponentProps<"svg">) {
	return (
		<LoaderIcon
			role="status"
			aria-label="Loading"
			className={cn("size-4 animate-spin", className)}
			{...props}
		/>
	);
}

export function SpinnerCustom({
	className,
	iconClassName,
	...props
}: ComponentProps<"div"> & { iconClassName?: string }) {
	return (
		<div className={cn("flex items-center gap-4", className)} {...props}>
			<Spinner className={iconClassName} />
		</div>
	);
}
