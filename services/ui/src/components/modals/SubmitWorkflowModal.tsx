import React, { useState } from "react";
import {
  XMarkIcon,
  PlayIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

interface Parameter {
  name: string;
  value?: string;
  description?: string;
  enum?: string[];
}

interface SubmitWorkflowModalProps {
  workflow: any;
  onClose: () => void;
  onSubmit: (finalWorkflow: any) => void;
}

export const SubmitWorkflowModal: React.FC<SubmitWorkflowModalProps> = ({
  workflow,
  onClose,
  onSubmit
}) => {
  // Extract initial parameters from workflow spec
  const initialParams: Parameter[] =
    workflow?.spec?.arguments?.parameters || [];

  // Local state to store user-provided values
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    initialParams.forEach((p) => {
      initial[p.name] = p.value || "";
    });
    return initial;
  });

  const handleInputChange = (name: string, value: string) => {
    setParamValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Create a deep copy of the workflow to avoid mutating props
    const finalWorkflow = JSON.parse(JSON.stringify(workflow));

    // Inject user-provided values back into the workflow spec
    if (finalWorkflow.spec?.arguments?.parameters) {
      finalWorkflow.spec.arguments.parameters =
        finalWorkflow.spec.arguments.parameters.map((p: any) => ({
          ...p,
          value:
            paramValues[p.name] !== undefined ? paramValues[p.name] : p.value
        }));
    }

    onSubmit(finalWorkflow);
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 outline-none focus:outline-none px-4 py-6">
        <div
          onClick={onClose}
          className="opacity-40 fixed inset-0 z-40 bg-black backdrop-blur-sm"
        ></div>
        <div className="relative w-full max-w-lg z-50">
          <div className="border-0 rounded-xl shadow-2xl relative flex flex-col w-full bg-white outline-none focus:outline-none overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <PlayIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Execute Workflow
                  </h3>
                  <p className="text-xs text-gray-500 font-medium truncate max-w-[280px]">
                    {workflow?.metadata?.name || "New Workflow"}
                  </p>
                </div>
              </div>
              <button
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                onClick={onClose}
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Body */}
              <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
                {initialParams.length > 0 ? (
                  <div className="space-y-6">
                    <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                      <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        This workflow template has input parameters. Configure
                        them below before starting the execution.
                      </p>
                    </div>

                    {initialParams.map((param) => (
                      <div key={param.name} className="flex flex-col">
                        <label
                          htmlFor={`param-${param.name}`}
                          className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center"
                        >
                          {param.name}
                        </label>

                        {param.enum ? (
                          <select
                            id={`param-${param.name}`}
                            value={paramValues[param.name]}
                            onChange={(e) =>
                              handleInputChange(param.name, e.target.value)
                            }
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-shadow hover:border-gray-400"
                          >
                            {param.enum.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            id={`param-${param.name}`}
                            value={paramValues[param.name]}
                            onChange={(e) =>
                              handleInputChange(param.name, e.target.value)
                            }
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 transition-shadow hover:border-gray-400"
                            placeholder={param.value || `Enter ${param.name}`}
                          />
                        )}

                        {param.description && (
                          <p className="mt-1.5 text-xs text-gray-500 italic">
                            {param.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <PlayIcon className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600">
                      No parameters to configure. Click submit to start the
                      execution.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end px-6 py-4 bg-gray-50 border-t border-gray-200 space-x-3">
                <button
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  type="button"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className="px-6 py-2 text-sm font-semibold text-white bg-[#004170] hover:bg-[#002f52] rounded-lg shadow-sm transition-colors flex items-center"
                  type="submit"
                >
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Submit Execution
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
