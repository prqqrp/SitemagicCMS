if (!window.JSShop)
	Fit.Validation.ThrowError("JSShop.js must be loaded");

JSShop.Models.Product = function(itemId)
{
	Fit.Validation.ExpectStringValue(itemId);
	Fit.Core.Extend(this, JSShop.Models.Base).Apply(itemId);

	var me = this;

	var properties =
	{
		Id: itemId,				// string
		Category: "",			// string
		Title: "",				// string
		Description: "",		// string
		Images: "",				// string
		Price: 0,				// number
		Vat: 0,					// number
		Currency: "",			// string
		Weight: 0,				// number
		WeightUnit: "",			// string
		DeliveryTime: "",		// string
		DiscountExpression: "",	// string
		DiscountMessage: ""		// string
	};

	function init()
	{
		me.InitializeModel();
	}

	this.GetModelName = function()
	{
		return "Product";
	}

	this.GetProperties = function()
	{
		return properties;
	}

	this.GetWebServiceUrls = function()
	{
		var urls =
		{
			Create: JSShop.WebService.Products.Create,
			Retrieve: JSShop.WebService.Products.Retrieve,
			RetrieveAll: JSShop.WebService.Products.RetrieveAll,
			Update: JSShop.WebService.Products.Update,
			Delete: JSShop.WebService.Products.Delete
		}

		return urls;
	}

	this.CalculateDiscount = function(units)
	{
		Fit.Validation.ExpectInteger(units);

		if (me.DiscountExpression() === "")
			return 0.0;

		var result = calculateExpression(units, me.DiscountExpression(), "number");

		return result;
	}

	this.CalculateDiscountMessage = function(units)
	{
		Fit.Validation.ExpectInteger(units);

		if (me.DiscountMessage() === "")
			return "";

		var result = calculateExpression(units, me.DiscountMessage(), "string");

		return result;
	}

	function calculateExpression(units, expression, returnType)
	{
		Fit.Validation.ExpectInteger(units);
		Fit.Validation.ExpectString(expression);
		Fit.Validation.ExpectStringValue(returnType);

		// Allow empty expression string

		if (expression === "")
		{
			if (returnType === "number")
			{
				return 0.0; //expression = "0.0";
			}
			else if (returnType === "string")
			{
				return ""; //expression = "''";
			}
			else
			{
				throw "InvalidReturnType: Return type must be either 'string' or 'number'";
			}
		}

		var ex = expression;

		// Security validation

		ex = ex.replace(/\r|\n|\t/g, ""); // Allow use of line breaks and tabs
		ex = ex.replace(/\/\*.*?\*\//g, ""); // Allow use of /*..*/ comments - ? after quantifier makes the match non-greedy
		ex = ex.replace(/data|units|price|vat|currency|weight|weightunit/g, ""); // Allow use of predefined variables
		ex = ex.replace(/JSShop.Floor|JSShop.Ceil|JSShop.Round/g, ""); // Allow use of functions
		ex = ex.replace(/ |[0-9]|\*|\+|\-|\/|%|=|&|\||!|\.|:|\(|\)|\[|\]|>|<|\?|true|false/g, ""); // Allow various math/comparison/logical operations
		ex = ex.replace(/(["']).*?\1/g, ""); // Allow use of double quoted and single quoted strings - ? after quantifiers makes the match non-greedy

		var secure = (ex === ""); // All valid elements were removed above, so if ex contains anything, it is potentially a security threat

		if (secure === false)
			throw "InvalidExpression: Invalid and potentially insecure expression detected - evaluation aborted";

		// Add data to expression

		var expr = "";
		expr += "var units = " + units + ";";
		expr += "var price = " + me.Price() + ";";
		expr += "var vat = " + me.Vat() + ";";
		expr += "var currency = \"" + me.Currency() + "\";";
		expr += "var weight = \"" + me.Weight() + "\";";
		expr += "var weightunit = \"" + me.WeightUnit() + "\";";
		expr += "var data = " + (JSShop.Settings.AdditionalData ? JSON.stringify(JSShop.Settings.AdditionalData) : "{}") + ";";
		expr += "(" + expression.replace(/JSShop\.Floor/g, "Math.floor").replace(/JSShop\.Ceil/g, "Math.ceil").replace(/JSShop\.Round/g, "Math.round") + ");";

		// Evaluate, validate, and return

		var result = eval(expr); // May throw error on invalid expression

		if (typeof(result) === "string")
			result = Fit.String.EncodeHtml(result);

		var isValid = false;

		if (returnType === "number")
		{
			isValid = /^\-?([0-9]+(\.[0-9]+)?)$/.test(result.toString()); // Prevent values such as 3.1580800726582476e-21 - both positive and negative values are allowed
			isValid = (isValid === true && typeof(result) === "number");
		}
		else if (returnType === "string")
		{
			isValid = (typeof(result) === "string");
		}
		else
		{
			throw "InvalidReturnType: Return type must be either 'string' or 'number'";
		}

		if (isValid === false)
			throw "InvalidExpressionResult: Expression did not produce a valid value of type '" + returnType + "'";

		return result;
	}

	init();
}
JSShop.Models.Product.RetrieveAll = function(category, cbSuccess, cbFailure)
{
	Fit.Validation.ExpectString(category);
	Fit.Validation.ExpectFunction(cbSuccess);
	Fit.Validation.ExpectFunction(cbFailure, true);

	var match = ((category !== "") ? [[{ Field: "Category", Operator: "=", Value: category }]] : []); // Multi dimensional: [ [match1 AND match2] OR [matchA AND matchB] OR ... ]
	JSShop.Models.Base.RetrieveAll(JSShop.Models.Product, "Id", match, cbSuccess, cbFailure);
}