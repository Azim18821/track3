import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  type: 'meal' | 'workout' | 'weight';
  name: string;
  date: string | Date;
  data: any;
}

interface ActivityListProps {
  activities: Activity[];
}

const ActivityList: React.FC<ActivityListProps> = ({ activities = [] }) => {
  return (
    <div className="mt-8">
      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Activities</h3>
      <Card>
        <ul className="divide-y divide-gray-200">
          {activities.length === 0 ? (
            <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
              No recent activities to display
            </li>
          ) : (
            activities.map((activity, index) => (
              <li key={index} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center
                      ${activity.type === 'meal' ? 'bg-primary-100' : 
                        activity.type === 'workout' ? 'bg-accent-100' : 'bg-gray-100'}`
                      }>
                      <i className={`fas fa-${
                        activity.type === 'meal' ? 'utensils' : 
                        activity.type === 'workout' ? 'dumbbell' : 'weight'
                      } text-${
                        activity.type === 'meal' ? 'primary' : 
                        activity.type === 'workout' ? 'accent' : 'gray'
                      }-600`}></i>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{activity.name}</div>
                      <div className="text-sm text-gray-500">
                        {activity.type === 'meal' && (
                          <>
                            {activity.data.calories} calories, {activity.data.protein}g protein
                          </>
                        )}
                        {activity.type === 'workout' && (
                          <>
                            {activity.data.duration} minutes
                          </>
                        )}
                        {activity.type === 'weight' && (
                          <>
                            {activity.data.weight} {activity.data.unit} 
                            {activity.data.change && (
                              <span className={activity.data.change > 0 ? 'text-green-500' : 'text-red-500'}>
                                {" "}({activity.data.change > 0 ? '+' : ''}{activity.data.change} {activity.data.unit})
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </Card>
    </div>
  );
};

export default ActivityList;
