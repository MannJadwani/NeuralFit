import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function NutritionTracker() {
  const [activeTab, setActiveTab] = useState("today");
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<"breakfast" | "lunch" | "dinner" | "snack">("breakfast");

  const todaysNutrition = useQuery(api.nutrition.getTodaysNutrition);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Nutrition Tracker</h2>
        <button
          onClick={() => setShowFoodSearch(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Food
        </button>
      </div>

      {/* Food Search Modal */}
      {showFoodSearch && (
        <FoodSearchModal
          selectedMeal={selectedMeal}
          onClose={() => setShowFoodSearch(false)}
        />
      )}

      {/* Daily Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
        
        {todaysNutrition ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{todaysNutrition.totalCalories}</div>
              <div className="text-sm text-gray-600">Calories</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{Math.round(todaysNutrition.totalMacros.protein)}g</div>
              <div className="text-sm text-gray-600">Protein</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">{Math.round(todaysNutrition.totalMacros.carbs)}g</div>
              <div className="text-sm text-gray-600">Carbs</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{Math.round(todaysNutrition.totalMacros.fat)}g</div>
              <div className="text-sm text-gray-600">Fat</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">No nutrition data for today. Start logging your meals!</p>
          </div>
        )}
      </div>

      {/* Meals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {["breakfast", "lunch", "dinner", "snack"].map((mealType) => (
          <MealCard
            key={mealType}
            mealType={mealType as any}
            meals={todaysNutrition?.meals || []}
            onAddFood={() => {
              setSelectedMeal(mealType as any);
              setShowFoodSearch(true);
            }}
          />
        ))}
      </div>

      {/* Water Intake */}
      <WaterTracker date={today} currentIntake={todaysNutrition?.waterIntake || 0} />
    </div>
  );
}

function FoodSearchModal({ selectedMeal, onClose }: { selectedMeal: string; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const searchResults = useQuery(api.nutrition.searchFoods, 
    searchQuery.length >= 2 ? { query: searchQuery } : "skip"
  );
  const logNutrition = useMutation(api.nutrition.logNutrition);

  const handleAddFood = async () => {
    if (!selectedFood) return;

    try {
      await logNutrition({
        date: new Date().toISOString().split('T')[0],
        mealType: selectedMeal as any,
        foods: [{
          foodId: selectedFood._id,
          quantity,
          unit: "serving",
        }],
      });
      
      toast.success("Food added successfully!");
      onClose();
    } catch (error) {
      toast.error("Failed to add food");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add Food to {selectedMeal}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Foods
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search for foods..."
            />
          </div>

          {searchResults && searchResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {searchResults.map((food) => (
                <button
                  key={food._id}
                  onClick={() => setSelectedFood(food)}
                  className={`w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 ${
                    selectedFood?._id === food._id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="font-medium">{food.name}</div>
                  <div className="text-sm text-gray-600">
                    {food.caloriesPerServing} cal per {food.servingSize}
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedFood && (
            <div className="border rounded-md p-4 bg-gray-50">
              <h4 className="font-medium mb-2">{selectedFood.name}</h4>
              <div className="text-sm text-gray-600 mb-3">
                {selectedFood.caloriesPerServing} cal per {selectedFood.servingSize}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity (servings)
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0.1"
                  step="0.1"
                />
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddFood}
              disabled={!selectedFood}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Add Food
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MealCard({ mealType, meals, onAddFood }: { 
  mealType: "breakfast" | "lunch" | "dinner" | "snack"; 
  meals: any[]; 
  onAddFood: () => void;
}) {
  const meal = meals.find(m => m.type === mealType);
  const foods = useQuery(api.exercises.listExercises, {}); // This should be foods, but using exercises as placeholder

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">{mealType}</h3>
        <button
          onClick={onAddFood}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          + Add Food
        </button>
      </div>

      {meal && meal.foods.length > 0 ? (
        <div className="space-y-2">
          {meal.foods.map((foodEntry: any, index: number) => (
            <div key={index} className="flex justify-between items-center text-sm">
              <span>Food Item {index + 1}</span>
              <span className="text-gray-600">{foodEntry.quantity} {foodEntry.unit}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No foods logged for {mealType}</p>
        </div>
      )}
    </div>
  );
}

function WaterTracker({ date, currentIntake }: { date: string; currentIntake: number }) {
  const [glassSize, setGlassSize] = useState(250); // ml
  const updateWaterIntake = useMutation(api.nutrition.updateWaterIntake);

  const handleAddWater = async () => {
    try {
      await updateWaterIntake({
        date,
        amount: glassSize,
      });
      toast.success(`Added ${glassSize}ml of water!`);
    } catch (error) {
      toast.error("Failed to log water intake");
    }
  };

  const glasses = Math.floor(currentIntake / glassSize);
  const dailyGoal = 2000; // ml
  const progress = Math.min((currentIntake / dailyGoal) * 100, 100);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Water Intake</h3>
      
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-2xl font-bold text-blue-600">{currentIntake}ml</p>
          <p className="text-sm text-gray-600">of {dailyGoal}ml goal</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{glasses} glasses</p>
          <p className="text-sm text-gray-600">({glassSize}ml each)</p>
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex items-center space-x-4">
        <select
          value={glassSize}
          onChange={(e) => setGlassSize(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={200}>200ml</option>
          <option value={250}>250ml</option>
          <option value={300}>300ml</option>
          <option value={500}>500ml</option>
        </select>
        <button
          onClick={handleAddWater}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Add Water
        </button>
      </div>
    </div>
  );
}
