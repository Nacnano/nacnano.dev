import React from "react";

interface TimelineItem {
  date: string;
  title: string;
  location?: string;
  description?: string;
}

interface TimelineProps {
  timelineItems: TimelineItem[];
}

const Timeline: React.FC<TimelineProps> = ({ timelineItems }) => {
  return (
    <div className="timeline relative flex flex-col items-center">
      <div className="absolute w-px bg-gray-200 dark:bg-gray-700 h-full left-1/2 transform -translate-x-1/2"></div>
      {timelineItems.map((item, index) => (
        <div key={index} className="flex items-center w-full mb-8">
          <div className="w-1/2 pr-8 text-right">
            <div className="text-md font-semibold text-gray-500">
              {item.date}
            </div>
          </div>
          <div className="relative w-1/2 pl-8">
            <div className="absolute w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="mt-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {item.title}
              </h3>
              {item.location && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {item.location}
                </div>
              )}
              {item.description && (
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {item.description}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
