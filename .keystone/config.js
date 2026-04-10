"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core7 = require("@keystone-6/core");
var import_config = require("dotenv/config");

// features/keystone/models/User.ts
var import_core = require("@keystone-6/core");
var import_access = require("@keystone-6/core/access");
var import_fields = require("@keystone-6/core/fields");

// features/keystone/access.ts
function isSignedIn({ session }) {
  return Boolean(session);
}
var permissions = {
  canManageLeads: ({ session }) => session?.data.role?.canManageLeads ?? false,
  canManageAllLeads: ({ session }) => session?.data.role?.canManageAllLeads ?? false,
  canManagePeople: ({ session }) => session?.data.role?.canManagePeople ?? false,
  canManageRoles: ({ session }) => session?.data.role?.canManageRoles ?? false,
  isAdmin: ({ session }) => session?.data?.isAdmin === true
};
var rules = {
  canReadPeople: ({ session }) => {
    if (!session) return false;
    if (session.data.role?.canSeeOtherPeople) return true;
    return { id: { equals: session.itemId } };
  },
  canUpdatePeople: ({ session }) => {
    if (!session) return false;
    if (session.data.role?.canEditOtherPeople) return true;
    return { id: { equals: session.itemId } };
  }
};

// features/keystone/models/User.ts
var User = (0, import_core.list)({
  access: {
    operation: {
      ...(0, import_access.allOperations)(isSignedIn),
      create: (args) => {
        if (process.env.PUBLIC_SIGNUPS_ALLOWED === "true") {
          return true;
        }
        return permissions.isAdmin(args);
      },
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ["name", "email", "phone", "specialty", "area", "isActive"]
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        if (session?.data.role?.canEditOtherPeople) return "edit";
        if (session?.itemId === item?.id) return "edit";
        return "read";
      }
    }
  },
  fields: {
    name: (0, import_fields.text)({
      validation: {
        isRequired: true
      }
    }),
    email: (0, import_fields.text)({
      isFilterable: false,
      isOrderable: false,
      isIndexed: "unique",
      validation: {
        isRequired: true
      }
    }),
    password: (0, import_fields.password)({
      access: {
        read: import_access.denyAll,
        update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id
      },
      validation: { isRequired: true }
    }),
    role: (0, import_fields.relationship)({
      ref: "Role.assignedTo",
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople
      },
      ui: {
        itemView: {
          fieldMode: (args) => permissions.canManagePeople(args) ? "edit" : "read"
        }
      }
    }),
    phone: (0, import_fields.text)(),
    specialty: (0, import_fields.text)(),
    area: (0, import_fields.text)(),
    telegramId: (0, import_fields.text)(),
    isActive: (0, import_fields.checkbox)({ defaultValue: true }),
    isAdmin: (0, import_fields.checkbox)({
      defaultValue: false,
      access: {
        // Any signed-in user can read (so the session can include it)
        read: isSignedIn,
        // Only admins can grant/revoke admin
        create: permissions.isAdmin,
        update: permissions.isAdmin
      }
    }),
    mustChangePassword: (0, import_fields.checkbox)({ defaultValue: false })
  }
});

// features/keystone/models/Role.ts
var import_core2 = require("@keystone-6/core");
var import_access3 = require("@keystone-6/core/access");
var import_fields2 = require("@keystone-6/core/fields");
var Role = (0, import_core2.list)({
  access: {
    operation: {
      ...(0, import_access3.allOperations)(permissions.canManageRoles),
      query: isSignedIn
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: {
      initialColumns: ["name", "assignedTo"]
    },
    itemView: {
      defaultFieldMode: (args) => permissions.canManageRoles(args) ? "edit" : "read"
    }
  },
  fields: {
    name: (0, import_fields2.text)({ validation: { isRequired: true } }),
    canManageLeads: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManageAllLeads: (0, import_fields2.checkbox)({ defaultValue: false }),
    canSeeOtherPeople: (0, import_fields2.checkbox)({ defaultValue: false }),
    canEditOtherPeople: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManagePeople: (0, import_fields2.checkbox)({ defaultValue: false }),
    canManageRoles: (0, import_fields2.checkbox)({ defaultValue: false }),
    canAccessDashboard: (0, import_fields2.checkbox)({ defaultValue: false }),
    assignedTo: (0, import_fields2.relationship)({
      ref: "User.role",
      many: true,
      ui: {
        itemView: { fieldMode: "read" }
      }
    })
  }
});

// features/keystone/models/Agent.ts
var import_core3 = require("@keystone-6/core");
var import_access5 = require("@keystone-6/core/access");
var import_fields3 = require("@keystone-6/core/fields");
var Agent = (0, import_core3.list)({
  access: {
    operation: {
      ...(0, import_access5.allOperations)(isSignedIn)
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "email", "phone", "specialty", "area", "isActive"]
    }
  },
  fields: {
    name: (0, import_fields3.text)({ validation: { isRequired: true } }),
    email: (0, import_fields3.text)({ isIndexed: "unique", validation: { isRequired: true } }),
    phone: (0, import_fields3.text)(),
    specialty: (0, import_fields3.text)(),
    area: (0, import_fields3.text)(),
    telegramId: (0, import_fields3.text)(),
    isActive: (0, import_fields3.checkbox)({ defaultValue: true }),
    user: (0, import_fields3.relationship)({
      ref: "User",
      many: false
    }),
    leads: (0, import_fields3.relationship)({
      ref: "Lead.assignedTo",
      many: true
    })
  }
});

// features/keystone/models/Lead.ts
var import_core4 = require("@keystone-6/core");
var import_access7 = require("@keystone-6/core/access");
var import_fields4 = require("@keystone-6/core/fields");
var Lead = (0, import_core4.list)({
  access: {
    operation: {
      ...(0, import_access7.allOperations)(isSignedIn)
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "email", "phone", "stage", "assignedTo", "source", "propertyInterest"]
    }
  },
  fields: {
    name: (0, import_fields4.text)({ validation: { isRequired: true } }),
    email: (0, import_fields4.text)(),
    phone: (0, import_fields4.text)(),
    stage: (0, import_fields4.select)({
      type: "string",
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Contacted", value: "contacted" },
        { label: "Qualified", value: "qualified" },
        { label: "Showing", value: "showing" },
        { label: "Offer", value: "offer" },
        { label: "Closing", value: "closing" },
        { label: "Won", value: "won" },
        { label: "Lost", value: "lost" }
      ],
      ui: { displayMode: "segmented-control" }
    }),
    source: (0, import_fields4.select)({
      type: "string",
      defaultValue: "manual",
      options: [
        { label: "Manual", value: "manual" },
        { label: "Email", value: "email" },
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Website", value: "website" },
        { label: "Referral", value: "referral" },
        { label: "Cold Call", value: "cold_call" }
      ]
    }),
    priority: (0, import_fields4.select)({
      type: "string",
      defaultValue: "medium",
      options: [
        { label: "Hot", value: "hot" },
        { label: "Warm", value: "warm" },
        { label: "Medium", value: "medium" },
        { label: "Cold", value: "cold" }
      ]
    }),
    budget: (0, import_fields4.text)(),
    notes: (0, import_fields4.text)({ ui: { displayMode: "textarea" } }),
    // Gmail lead ingestion fields
    propertyInterest: (0, import_fields4.text)(),
    message: (0, import_fields4.text)({ ui: { displayMode: "textarea" } }),
    followUpDate: (0, import_fields4.timestamp)(),
    // NOTE: isIndexed: 'unique' omitted on purpose — Keystone's unique index
    // would disallow NULLs, but manual leads have no thread ID. The unique
    // constraint is enforced by a Postgres partial unique index in the
    // migration (WHERE "emailThreadId" IS NOT NULL). Field is nullable so
    // multiple manual leads (NULL thread IDs) don't collide.
    emailThreadId: (0, import_fields4.text)({ db: { isNullable: true } }),
    assignedTo: (0, import_fields4.relationship)({
      ref: "Agent.leads",
      many: false
    }),
    property: (0, import_fields4.relationship)({
      ref: "Property.leads",
      many: false
    }),
    activities: (0, import_fields4.relationship)({
      ref: "Activity.lead",
      many: true
    }),
    createdAt: (0, import_fields4.timestamp)({ defaultValue: { kind: "now" } }),
    updatedAt: (0, import_fields4.timestamp)({
      db: { updatedAt: true }
    })
  }
});

// features/keystone/models/Property.ts
var import_core5 = require("@keystone-6/core");
var import_access9 = require("@keystone-6/core/access");
var import_fields5 = require("@keystone-6/core/fields");
var Property = (0, import_core5.list)({
  access: {
    operation: {
      ...(0, import_access9.allOperations)(isSignedIn)
    }
  },
  ui: {
    listView: {
      initialColumns: ["address", "type", "price", "status", "bedrooms"]
    }
  },
  fields: {
    address: (0, import_fields5.text)({ validation: { isRequired: true } }),
    city: (0, import_fields5.text)(),
    state: (0, import_fields5.text)(),
    zip: (0, import_fields5.text)(),
    type: (0, import_fields5.select)({
      type: "string",
      defaultValue: "single_family",
      options: [
        { label: "Single Family", value: "single_family" },
        { label: "Condo", value: "condo" },
        { label: "Townhouse", value: "townhouse" },
        { label: "Multi-Family", value: "multi_family" },
        { label: "Land", value: "land" },
        { label: "Commercial", value: "commercial" }
      ]
    }),
    status: (0, import_fields5.select)({
      type: "string",
      defaultValue: "active",
      options: [
        { label: "Active", value: "active" },
        { label: "Pending", value: "pending" },
        { label: "Sold", value: "sold" },
        { label: "Off Market", value: "off_market" }
      ]
    }),
    price: (0, import_fields5.float)(),
    bedrooms: (0, import_fields5.integer)(),
    bathrooms: (0, import_fields5.float)(),
    sqft: (0, import_fields5.integer)(),
    yearBuilt: (0, import_fields5.integer)(),
    description: (0, import_fields5.text)({ ui: { displayMode: "textarea" } }),
    mlsNumber: (0, import_fields5.text)(),
    agent: (0, import_fields5.relationship)({
      ref: "User",
      many: false
    }),
    leads: (0, import_fields5.relationship)({
      ref: "Lead.property",
      many: true
    }),
    createdAt: (0, import_fields5.timestamp)({ defaultValue: { kind: "now" } })
  }
});

// features/keystone/models/Activity.ts
var import_core6 = require("@keystone-6/core");
var import_access11 = require("@keystone-6/core/access");
var import_fields6 = require("@keystone-6/core/fields");
var Activity = (0, import_core6.list)({
  access: {
    operation: {
      ...(0, import_access11.allOperations)(isSignedIn)
    }
  },
  ui: {
    listView: {
      initialColumns: ["type", "lead", "summary", "performedBy", "createdAt"]
    }
  },
  fields: {
    type: (0, import_fields6.select)({
      type: "string",
      validation: { isRequired: true },
      options: [
        { label: "Email Sent", value: "email_sent" },
        { label: "Email Received", value: "email_received" },
        { label: "Call Made", value: "call_made" },
        { label: "Call Received", value: "call_received" },
        { label: "WhatsApp Sent", value: "whatsapp_sent" },
        { label: "WhatsApp Received", value: "whatsapp_received" },
        { label: "Showing Scheduled", value: "showing_scheduled" },
        { label: "Showing Completed", value: "showing_completed" },
        { label: "Offer Made", value: "offer_made" },
        { label: "Note Added", value: "note" },
        { label: "Stage Changed", value: "stage_change" },
        { label: "Assignment Changed", value: "assignment_change" }
      ]
    }),
    summary: (0, import_fields6.text)({ validation: { isRequired: true } }),
    details: (0, import_fields6.text)({ ui: { displayMode: "textarea" } }),
    lead: (0, import_fields6.relationship)({
      ref: "Lead.activities",
      many: false
    }),
    performedBy: (0, import_fields6.relationship)({
      ref: "User",
      many: false
    }),
    createdAt: (0, import_fields6.timestamp)({ defaultValue: { kind: "now" } })
  }
});

// features/keystone/models/index.ts
var models = {
  User,
  Role,
  Agent,
  Lead,
  Property,
  Activity
};

// features/keystone/index.ts
var import_session = require("@keystone-6/core/session");

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(root, args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/mutations/index.ts
var graphql = String.raw;
function extendGraphqlSchema(baseSchema) {
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: graphql`
      type Query {
        redirectToInit: Boolean
      }
    `,
    resolvers: {
      Query: {
        redirectToInit: redirectToInit_default
      }
    }
  });
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var transport = (0, import_nodemailer.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";
  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendPasswordResetEmail(resetToken, to, baseUrl) {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`
    })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
  }
}

// features/keystone/index.ts
var databaseURL = process.env.DATABASE_URL || "file:./keystone.db";
var sessionConfig = {
  maxAge: 60 * 60 * 24 * 360,
  // How long they stay signed in?
  secret: (() => {
    const s = process.env.SESSION_SECRET;
    if (!s || s.includes("testing") || s.includes("change-me")) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET must be set to a strong random value in production");
      }
      return "dev-only-insecure-session-secret-do-not-use-in-prod";
    }
    return s;
  })()
};
var {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "ap-southeast-2",
  S3_ACCESS_KEY_ID: accessKeyId = "keystone",
  S3_SECRET_ACCESS_KEY: secretAccessKey = "keystone",
  S3_ENDPOINT: endpoint = "https://sfo3.digitaloceanspaces.com"
} = process.env;
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Admin",
          canManageLeads: true,
          canManageAllLeads: true,
          canSeeOtherPeople: true,
          canEditOtherPeople: true,
          canManagePeople: true,
          canManageRoles: true,
          canAccessDashboard: true
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken(args) {
      await sendPasswordResetEmail(args.token, args.identity);
    }
  },
  sessionData: `
    name
    email
    isAdmin
    mustChangePassword
    role {
      id
      name
      canManageLeads
      canManageAllLeads
      canSeeOtherPeople
      canEditOtherPeople
      canManagePeople
      canManageRoles
      canAccessDashboard
    }
  `
});
var keystone_default = withAuth(
  (0, import_core7.config)({
    db: {
      provider: "postgresql",
      url: databaseURL
    },
    lists: models,
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5e3 },
        forcePathStyle: true
      }
    },
    ui: {
      isAccessAllowed: ({ session }) => session?.data.role?.canAccessDashboard ?? false
    },
    session: (0, import_session.statelessSessions)(sessionConfig),
    graphql: {
      extendGraphqlSchema
    }
  })
);

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
