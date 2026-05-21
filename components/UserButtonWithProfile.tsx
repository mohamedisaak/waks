"use client";

import { UserButton, useAuth, useOrganizationList } from "@clerk/nextjs";
import { useManagementNav } from "@/hooks/useManagementNav";

export default function UserButtonWithProfile() {
  const { orgId } = useAuth();
  const { userMemberships } = useOrganizationList({ userMemberships: true });
  const { paths, isPlatformAdmin } = useManagementNav();

  const isEmployer = !!orgId || (userMemberships?.data?.length ?? 0) > 0;
  const showManagementLinks = isEmployer || isPlatformAdmin;

  if (showManagementLinks) {
    return (
      <UserButton afterSignOutUrl="/">
        <UserButton.MenuItems>
          <UserButton.Link
            label={isPlatformAdmin ? "Platform admin" : "Company Dashboard"}
            labelIcon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            }
            href={paths.home}
          />
          <UserButton.Link
            label={isPlatformAdmin ? "Admins & audit" : "Company Settings"}
            labelIcon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                  clipRule="evenodd"
                />
              </svg>
            }
            href={paths.settings}
          />
          <UserButton.Link
            label="Edit Profile"
            labelIcon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
              </svg>
            }
            href="/profile"
          />
        </UserButton.MenuItems>
      </UserButton>
    );
  }

  return (
    <UserButton afterSignOutUrl="/">
      <UserButton.MenuItems>
        {isPlatformAdmin && (
          <UserButton.Link
            label="Platform admin"
            labelIcon={
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M2 4.75A2.75 2.75 0 014.75 2h10.5A2.75 2.75 0 0118 4.75v10.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25V4.75zm4.5 2.5a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5zm3 0a.75.75 0 00-1.5 0v6.5a.75.75 0 001.5 0v-6.5zm3 0a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5z"
                  clipRule="evenodd"
                />
              </svg>
            }
            href={paths.home}
          />
        )}
        <UserButton.Link
          label="Edit Profile"
          labelIcon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
            </svg>
          }
          href="/profile"
        />
      </UserButton.MenuItems>
    </UserButton>
  );
}
