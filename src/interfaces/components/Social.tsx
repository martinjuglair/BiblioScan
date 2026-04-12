import { useState } from "react";
import { Groups } from "./Groups";
import { FriendsList } from "./FriendsList";
import { Inbox } from "./Inbox";
import { hapticLight } from "@interfaces/utils/haptics";

type SocialTab = "friends" | "groups" | "inbox";

interface SocialProps {
  onSelectGroup: (groupId: string) => void;
}

export function Social({ onSelectGroup }: SocialProps) {
  const [activeTab, setActiveTab] = useState<SocialTab>("friends");

  const handleTabChange = (tab: SocialTab) => {
    hapticLight();
    setActiveTab(tab);
  };

  const tabs: { key: SocialTab; label: string }[] = [
    { key: "friends", label: "Amis" },
    { key: "groups", label: "Groupes" },
    { key: "inbox", label: "Bo\u00eete" },
  ];

  return (
    <div className="px-3 sm:px-4 py-4">
      {/* Segmented control */}
      <div className="flex bg-surface-subtle rounded-xl p-1 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
              activeTab === tab.key
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-tertiary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "friends" && <FriendsList />}
      {activeTab === "groups" && <Groups onSelectGroup={onSelectGroup} />}
      {activeTab === "inbox" && <Inbox />}
    </div>
  );
}
