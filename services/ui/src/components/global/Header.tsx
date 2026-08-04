import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";

interface HeaderProps {
  name?: string;
}

const Header = ({ name }: HeaderProps) => {
  return (
    <div className="px-8 py-5 border-b border-gray-200 bg-white flex items-center justify-between">
      <div className="flex items-center space-x-5">
        <Link
          to="/"
          className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          title="Back to Workflows"
        >
          <ChevronLeftIcon className="h-5 w-5 text-[#004170]" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#004170] hover:opacity-80 transition-opacity">
            <Link to="/">{name || "New Workflow"}</Link>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure template metadata, write YAML definitions, track
            executions, and manage cluster resources
          </p>
        </div>
      </div>
    </div>
  );
};

export default Header;
